(function (global) {
    const zoomsFinder = function (options, callback, errorCallback) {
        const zoomsFinder = {};

        const processJSONData = function (jsonData) {
            try {
                let processedRows = [];
                const keys = Object.keys(jsonData).filter(key => !key.startsWith('_hypo'));
                let headers = [zoomsFinder.options.categoryColumnName, zoomsFinder.options.sampleColumnName];
                let mstHeadersAdded = false;
                keys.forEach(key => {
                    const entry = jsonData[key];
                    
                    if (!entry || !entry[zoomsFinder.options.sampleColumnName] || !entry[zoomsFinder.options.categoryColumnName]) {
                        return;
                    }

                    let row = [];

                    if (!mstHeadersAdded) {
                        for (const property in entry) {
                            if (property.startsWith(options.prefixMSTColumnName) && !headers.includes(property)) {
                                headers.push(property);
                            }
                        }
                        mstHeadersAdded = true;
                    }

                    headers.forEach(header => {
                        row.push(entry[header] || '');
                    });

                    processedRows.push(row);
                });
                return { headers, rows: processedRows };
            } catch (e) {
                throw new Error(e.message);
            }
        };

        const processTSVData = function (data) {
            try {
                const rows = data.split('\n').map(line => line.split('\t'));
                const headers = rows[0];
                const sampleColumnIndex = headers.indexOf(zoomsFinder.options.sampleColumnName);
                const categoryColumnIndex = headers.indexOf(zoomsFinder.options.categoryColumnName);
                const mstColumnIndices = headers.reduce((acc, header, index) => {
                    if (header.startsWith(zoomsFinder.options.prefixMSTColumnName)) {
                        acc.push(index);
                    }
                    return acc;
                }, []);
                if (sampleColumnIndex === -1) {
                    throw new Error('Error: CMP column not found in the data');
                }
                if (categoryColumnIndex === -1) {
                    throw new Error('Error: category column not found in the data');
                }
                if (!mstColumnIndices || mstColumnIndices.length == 0) {
                    throw new Error('Error: No MSTs found in the data');
                }
                const relevantColumnIndices = [categoryColumnIndex, sampleColumnIndex, ...mstColumnIndices];
                const filteredRows = rows.map(row =>
                    relevantColumnIndices.map(index => row[index])
                );
                const filteredHeaders = relevantColumnIndices.map(index => rows[0][index]);
                return { headers: filteredHeaders, rows: filteredRows.slice(1) };
            } catch (e) {
                throw new e;
            }
        };

        const loadFile = function (uri, callback, errorCallback) {
            try {
                fetch(uri)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP error! Status: ${response.status}`);
                        }
                        return response.text();
                    })
                    .then(content => callback(content))
                    .catch(error => {
                        if (typeof errorCallback === 'function') {
                            errorCallback(error);
                        } else {
                            console.error('Error fetching file:', error);
                        }
                    });
            } catch (e) {
                throw new e;
            }
        };

        const extractMSTs = function (headers) {
            try {
                return headers.filter(header => header.startsWith(zoomsFinder.options.prefixMSTColumnName));
            } catch (e) {
                throw new e;
            }
        };

        const samplesByMSTAndCluster = function (headers, rows) {
            try {
                const result = {};
                const cmpIndex = headers.indexOf(zoomsFinder.options.sampleColumnName);
                const slicedHeaders = headers.slice(cmpIndex + 1);
                rows.forEach(row => {
                    const cmpValue = row[cmpIndex];
                    slicedHeaders.forEach((header, index) => {
                        const mstValue = row[cmpIndex + index + 1];
                        if (mstValue) {
                            result[header] = result[header] || {};
                            result[header][mstValue] = result[header][mstValue] || [];
                            result[header][mstValue].push(cmpValue);
                        }
                    });
                });
                return result;
            } catch (e) {
                throw new e;
            }
        };

        // Custom sort function
        const customSort = (a, b) => {
            const numA = parseInt(a.split('_')[1], 10);
            const numB = parseInt(b.split('_')[1], 10);
            return numA - numB;
        };

        const clustersByCategoryAndMST = function (headers, rows) {
            try {
                const result = {};
                const categoryIndex = headers.indexOf(zoomsFinder.options.categoryColumnName);
                const cmpIndex = headers.indexOf(zoomsFinder.options.sampleColumnName);
                const slicedHeaders = headers.slice(cmpIndex + 1);
                rows.forEach(row => {
                    const categoryValue = row[categoryIndex];
                    if (categoryValue) {
                        result[categoryValue] = result[categoryValue] || {};
                        slicedHeaders.forEach((header, index) => {
                            const mstValue = row[index + cmpIndex + 1];
                            if (mstValue && (!zoomsFinder.options.skipSingletonsInClustersByCategoryAndMST || !mstValue.startsWith(zoomsFinder.options.prefixSingleton))) {
                                result[categoryValue][header] = result[categoryValue][header] || new Set();
                                result[categoryValue][header].add(mstValue);
                            }
                        });
                    }
                });

                Object.keys(result).forEach(category => {
                    Object.keys(result[category]).forEach(header => {
                        const arrayFromSet = Array.from(result[category][header]);
                        result[category][header] = zoomsFinder.options.sortedClustersByCategoryAndMST ? arrayFromSet.sort(customSort) : arrayFromSet;
                    });
                });

                return result;
            } catch (e) {
                throw new e;
            }
        };

        const clustersBySampleAndMST = function (headers, rows) {
            try {
                const result = {};
                const cmpIndex = headers.indexOf(zoomsFinder.options.sampleColumnName);
                const slicedHeaders = headers.slice(cmpIndex + 1);
                rows.forEach(row => {
                    const cmpValue = row[cmpIndex];
                    if (cmpValue && !result[cmpValue]) {
                        result[cmpValue] = {};
                    }
                    slicedHeaders.forEach((header, index) => {
                        const mstValue = row[index + cmpIndex + 1];
                        if (cmpValue && mstValue) {
                            result[cmpValue][header] = result[cmpValue][header] || [];
                            result[cmpValue][header].push(mstValue);
                        }
                    });
                });
                return result;
            } catch (e) {
                throw new e;
            }
        };

        zoomsFinder.options = {
            ...{
                prefixSingleton: 'singleton_',
                prefixMSTColumnName: 'MST-',
                sampleColumnName: 'CMP',
                categoryColumnName: 'category',
                skipSingletonsInClustersBySampleAndMST: true,
                skipSingletonsInClustersByCategoryAndMST: true,
                skipSingletonsInSamplesByMSTAndCluster: true,
                sortedClustersByCategoryAndMST: false
            },
            ...options
        };


        (function () {
            if (zoomsFinder.options.metadataURI) {
                loadFile(zoomsFinder.options.metadataURI, contentFile => {
                    try {
                        const { headers, rows } = processTSVData(contentFile);
                        const MSTs = extractMSTs(headers);
                        callback && callback(
                            MSTs,
                            MSTs && MSTs.length > 0 ? samplesByMSTAndCluster(headers, rows) : [],
                            MSTs && MSTs.length > 0 ? clustersBySampleAndMST(headers, rows) : [],
                            MSTs && MSTs.length > 0 ? clustersByCategoryAndMST(headers, rows) : {}
                        );
                    } catch (error) {
                        if (typeof errorCallback === 'function') {
                            errorCallback(error);
                        } else {
                            console.error('Error in processing TSV metadata:', error);
                        }
                    }
                }, errorCallback);
            } else if (zoomsFinder.options.metadata) {
                try {
                    const { headers, rows } = processJSONData(zoomsFinder.options.metadata);
                    const MSTs = extractMSTs(headers);
                    callback && callback(
                        MSTs,
                        MSTs && MSTs.length > 0 ? samplesByMSTAndCluster(headers, rows) : [],
                        MSTs && MSTs.length > 0 ? clustersBySampleAndMST(headers, rows) : [],
                        MSTs && MSTs.length > 0 ? clustersByCategoryAndMST(headers, rows) : {}
                    );
                } catch (error) {
                    if (typeof errorCallback === 'function') {
                        errorCallback(error);
                    } else {
                        console.error('Error in processing JSON metadata:', error);
                    }
                }
            } else {
                console.error('No metadata provided');
            }
        })();

        return zoomsFinder;
    };

    global.zoomsFinder = zoomsFinder;
}(this));