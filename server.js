const express = require('express');
const axios = require('axios');
const cors = require('cors');
const url = require('url');
const path = require('path');
const https = require('https');
const fs = require('fs');

const app = express();

// Enable CORS and increase payload limit
app.use(cors());

app.use(express.json({
    limit: process.env.EXPRESS_JSON_LIMIT || '10mb'
}));

app.use(express.urlencoded({
    extended: true,
    limit: process.env.EXPRESS_URLENCODED_LIMIT || '2mb'
}));

// Custom axios instance with extended timeout and SSL handling
const client = axios.create({
    timeout: 60000,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    httpsAgent: new https.Agent({
        rejectUnauthorized: false,
        keepAlive: true
    }),
    // Important for Google Drive: follow redirects
    maxRedirects: 5
});

// Headers builder function
const buildHeaders = (fileUrl) => {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive'
    };
    return headers;
};

app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'index.html');
    fs.readFile(indexPath, 'utf8', (err, data) => {
        if (err) {
            console.error("File read error:", err);
            return res.status(500).send('Error loading index.html');
        }
        res.setHeader('Content-Type', 'text/html');
        res.send(data);
    });
});

app.use(express.static(__dirname));

const ALLOWED_DOMAINS_FOR_DOWNLOAD = new Set(
    (process.env.EXPRESS_ALLOWED_DOMAINS_FOR_DOWNLOAD || '').split(',')
);

function isAllowedDomain(fileUrl) {
    try {
        const parsedUrl = new URL(fileUrl);
        const domain = parsedUrl.hostname;
        if (ALLOWED_DOMAINS_FOR_DOWNLOAD.has('*')) {
            return true;
        }
        return ALLOWED_DOMAINS_FOR_DOWNLOAD.has(domain);
    } catch {
        return false;
    }
}

// Download endpoint
app.get('/download', async (req, res) => {
    const { url: fileUrl } = req.query;

    if (!fileUrl) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    if (!isAllowedDomain(fileUrl)) {
        return res.status(403).json({ error: 'Domain not allowed' });
    }

    try {
        console.log(`Attempting to download: ${fileUrl}`);

        let response = await client({
            method: 'GET',
            url: fileUrl,
            responseType: 'stream',
            headers: buildHeaders(fileUrl)
        });
        // Get filename from content-disposition header or URL
        let fileName = '';
        const contentDispositionHeader = response.headers['content-disposition'];
        if (contentDispositionHeader) {
            const match = contentDispositionHeader.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (match) {
                fileName = match[1].replace(/['"]/g, '');
            }
        }
        if (!fileName) {
            fileName = path.basename(url.parse(fileUrl).pathname);
        }

        // Set response headers
        res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        // Copy other relevant headers
        ['content-length', 'last-modified', 'etag'].forEach(header => {
            if (response.headers[header]) {
                res.setHeader(header, response.headers[header]);
            }
        });

        // Stream handling with error management
        const stream = response.data;

        stream.on('error', (error) => {
            console.error('Stream error:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Stream error', details: error.message });
            }
        });

        // Pipe the response with error handling
        stream.pipe(res).on('error', (error) => {
            console.error('Pipe error:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Pipe error', details: error.message });
            }
        });

        // Log successful completion
        stream.on('end', () => {
            console.log(`Successfully downloaded: ${fileUrl}`);
        });

    } catch (error) {
        console.error('Download error:', error);
        const statusCode = error.response?.status || 500;
        res.status(statusCode).json({
            error: 'Download failed',
            details: error.message,
            status: statusCode
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        details: err.message
    });
});

// Start server
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access the application at http://localhost:${PORT}`);
});

// Handle process termination
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    process.exit(0);
});