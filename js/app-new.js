// Global variables
let tableManager, searchManager;

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize managers
    tableManager = window.tableManager || new TableManager();
    searchManager = window.searchManager || new SearchManager(tableManager);
    
    // Store references globally
    window.tableManager = tableManager;
    window.searchManager = searchManager;
    
    // Initialize the table manager
    if (window.tableManager) {
        window.tableManager.initialize();
    }
    
    // Set up event listeners
    setupEventListeners();
    
    // Set up modal close buttons
    setupModalCloseButtons();
    
    // Load data from localStorage if available
    loadFromLocalStorage();
});

// Set up modal close buttons
function setupModalCloseButtons() {
    // Get all elements with class="close"
    const closeButtons = document.getElementsByClassName('close');
    
    // Add click event to each close button
    for (let i = 0; i < closeButtons.length; i++) {
        closeButtons[i].onclick = function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        };
    }
}

// Set up event listeners
function setupEventListeners() {
    // Get DOM elements
    const fetchDataBtn = document.getElementById('fetchData');
    
    // Add event listener for fetch data button
    if (fetchDataBtn) {
        fetchDataBtn.addEventListener('click', fetchDataFromGoogleSheets);
    }
}

// Fetch data from Google Sheets
function fetchDataFromGoogleSheets() {
    showLoading();
    
    // Get the URL from the link file
    fetch('link')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(content => {
            // Get the first URL from the link file
            const url = content.trim();
            if (!url.startsWith('http')) {
                hideLoading();
                throw new Error('Invalid URL in the link file');
            }
            
            // For Google Sheets, show sheet selection
            if (url.includes('docs.google.com/spreadsheets/')) {
                // Hide loading screen before showing sheet selection
                hideLoading();
                
                // Check if this is a published sheet (contains /pub in URL)
                if (!url.includes('/pub')) {
                    // If not published, show instructions
                    showNotification('Please make sure the Google Sheet is published to the web. Go to File > Share > Publish to web and select "Comma-separated values (.csv)"', 'error');
                    return Promise.reject('Sheet not published');
                }
                
                // Get the base URL without query parameters
                const baseUrl = url.split('/edit')[0]; // Remove any edit portion
                
                // Show sheet selection modal
                return new Promise((resolve) => {
                    showSheetSelection(baseUrl)
                        .then(selectedUrl => {
                            if (selectedUrl) {
                                showLoading(); // Show loading when a sheet is selected
                                fetchCSVData(selectedUrl)
                                    .then(resolve)
                                    .catch(error => {
                                        console.error('Error fetching CSV data:', error);
                                        showNotification(`Error loading sheet: ${error.message}`, 'error');
                                        hideLoading();
                                    });
                            } else {
                                // User cancelled sheet selection
                                resolve();
                            }
                        });
                });
            } else {
                // For direct CSV URLs, use as is
                return fetchCSVData(url);
            }
        })
        .catch(error => {
            console.error('Error in fetchDataFromGoogleSheets:', error);
            if (error !== 'No sheet selected' && error !== 'Sheet not published') {
                showNotification(`Error: ${error.message || error}`, 'error');
            }
            hideLoading();
        });
}

// Show sheet selection modal
function showSheetSelection(baseUrl) {
    return new Promise((resolve) => {
        const sheetModal = document.getElementById('sheetModal');
        const sheetList = document.getElementById('sheetList');
        
        // Show loading message
        sheetList.innerHTML = '<div class="loading">Loading sheets...</div>';
        sheetModal.style.display = 'block';
        
        // Extract spreadsheet ID from the URL
        const spreadsheetIdMatch = baseUrl.match(/[\/\-][\w-]{30,}/);
        if (!spreadsheetIdMatch) {
            sheetList.innerHTML = `
                <div class="error">
                    <p>Invalid Google Sheets URL. Please make sure:</p>
                    <ol>
                        <li>You're using a valid Google Sheets URL</li>
                        <li>The URL looks like: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit</li>
                    </ol>
                </div>`;
            resolve(null);
            return;
        }
        
        // Extract the full spreadsheet ID from the URL
        const fullSpreadsheetId = baseUrl.split('/d/')[1].split('/')[0];
        // Use the Google Sheets API v4 to get sheet names
        const apiUrl = `https://docs.google.com/spreadsheets/d/${fullSpreadsheetId}/export?format=csv&id=${fullSpreadsheetId}&gid=0`;
        
        fetch(apiUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(data => {
                // The response might have some prefix like )]}' that needs to be removed
                const jsonData = JSON.parse(data.replace(/^[^{]*/g, ''));
                const sheets = jsonData.table?.cols || [];
                
                // Clear loading message
                sheetList.innerHTML = '';
                
                if (sheets.length === 0) {
                    sheetList.innerHTML = '<div class="error">No sheets found in this document.</div>';
                    return;
                }
                
                // Add header
                const header = document.createElement('div');
                header.className = 'sheet-header';
                header.textContent = 'Select a sheet to load:';
                sheetList.appendChild(header);
                
                // Add sheet items
                sheets.forEach((sheet, index) => {
                    const sheetName = sheet.label || `Sheet ${index + 1}`;
                    const sheetItem = document.createElement('div');
                    sheetItem.className = 'sheet-item';
                    sheetItem.textContent = sheetName;
                    sheetItem.onclick = () => {
                        // Update the main title with the sheet name
                        const mainTitle = document.getElementById('mainTitle');
                        if (mainTitle) {
                            mainTitle.textContent = `Search Your Data In - ${sheetName}`;
                        }
                        
                        // Close the modal and resolve with the selected sheet URL
                        sheetModal.style.display = 'none';
                        resolve(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`);
                    };
                    sheetList.appendChild(sheetItem);
                });
            })
            .catch(error => {
                console.error('Error fetching sheet names:', error);
                sheetList.innerHTML = `
                    <div class="error">
                        <p>Error loading sheets. Please make sure:</p>
                        <ol>
                            <li>The Google Sheet is published to the web</li>
                            <li>Sharing settings are set to "Anyone with the link" can view</li>
                            <li>You're using a valid Google Sheets URL</li>
                        </ol>
                        <p>Error details: ${error.message}</p>
                    </div>`;
                resolve(null);
            });
            
        // Close modal when clicking the X button or outside the modal
        const closeButton = sheetModal.querySelector('.close');
        if (closeButton) {
            closeButton.onclick = () => {
                sheetModal.style.display = 'none';
                resolve(null);
            };
        }
        
        window.onclick = (event) => {
            if (event.target === sheetModal) {
                sheetModal.style.display = 'none';
                resolve(null);
            }
        };
    });
}

// Fetch CSV data from URL
function fetchCSVData(url) {
    // For Google Sheets, don't add cache-busting as it might break the URL
    const fetchUrl = url.includes('google.com') ? url : `${url}${url.includes('?') ? '&' : '?'}t=${new Date().getTime()}`;
    
    // Only add headers for non-Google URLs as Google Sheets might block requests with these headers
    const options = url.includes('google.com') 
        ? {}
        : {
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        };
    
    return fetch(fetchUrl, options)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(responseData => {
            // Check if this is an HTML error page
            if (responseData.trim().startsWith('<!DOCTYPE') || responseData.includes('<html')) {
                // This is an HTML error page, not the expected CSV
                throw new Error('Could not access the Google Sheet. Please make sure it is published to the web.');
            }
            
            // Parse the first line as headers to get column names
            const lines = responseData.split('\n');
            if (lines.length === 0 || (lines.length === 1 && lines[0].trim() === '')) {
                throw new Error('No data found in the sheet');
            }
            
            // Get the headers from the first line
            const headers = lines[0].split(',').map(h => h.trim());
            
            // Update the sheet list with the headers as sheet names
            sheetList.innerHTML = '';
            const headerElement = document.createElement('div');
            headerElement.className = 'sheet-header';
            headerElement.textContent = 'Select a sheet to load:';
            sheetList.appendChild(headerElement);
            
            // Add each header as a sheet item
            headers.forEach((headerName, index) => {
                if (headerName) {
                    const sheetItem = document.createElement('div');
                    sheetItem.className = 'sheet-item';
                    sheetItem.textContent = headerName;
                    sheetItem.onclick = () => {
                        const mainTitle = document.getElementById('mainTitle');
                        if (mainTitle) {
                            mainTitle.textContent = `Search Your Data In - ${headerName}`;
                        }
                        sheetModal.style.display = 'none';
                        resolve(`https://docs.google.com/spreadsheets/d/${fullSpreadsheetId}/export?format=csv&gid=${index}`);
                    };
                    sheetList.appendChild(sheetItem);
                }
            });
        })
        .catch(error => {
            console.error('Error in fetchCSVData:', error);
            showNotification(`Error: ${error.message}`, 'error');
            hideLoading();
            throw error;
        });
}

// Parse CSV data into an array of objects
function parseCSV(csvData) {
    const lines = csvData.split('\n').filter(line => line.trim() !== '');
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map(line => {
        const values = line.split(',');
        return headers.reduce((obj, header, index) => {
            obj[header] = values[index] ? values[index].trim() : '';
            return obj;
        }, {});
    });
}

// Show loading overlay
function showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
}

// Hide loading overlay
function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Implementation of showNotification
    console.log(`[${type}] ${message}`);
}

// Load data from localStorage
function loadFromLocalStorage() {
    try {
        const savedData = localStorage.getItem('tableData');
        if (savedData) {
            const data = JSON.parse(savedData);
            if (tableManager && typeof tableManager.setData === 'function') {
                tableManager.setData(data);
                return true;
            }
        }
    } catch (error) {
        console.error('Error loading data from localStorage:', error);
    }
    return false;
}

// Save data to localStorage
function saveToLocalStorage(data) {
    try {
        localStorage.setItem('tableData', JSON.stringify(data));
    } catch (error) {
        console.error('Error saving data to localStorage:', error);
    }
}
