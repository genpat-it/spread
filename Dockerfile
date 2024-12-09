# Use Node.js 20 Alpine as base
FROM node:20-alpine

# Install required system packages
RUN apk add --no-cache curl

# Create app directory
WORKDIR /usr/src/app

# Copy package files first for better caching
COPY package.json ./

# Install dependencies
RUN npm install --production

# Copy all source files
COPY . .

# Create a non-root user
RUN addgroup -S appuser && adduser -S appuser -G appuser

# Change ownership of the app directory to the non-root user
RUN chown -R appuser:appuser /usr/src/app

ENV EXPRESS_JSON_LIMIT=10mb
ENV EXPRESS_URLENCODED_LIMIT=5mb
#ENV EXPRESS_ALLOWED_DOMAINS_FOR_DOWNLOAD="domain1.com,domain2.com,domain3.com"

USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start the server
CMD ["npm", "start"]