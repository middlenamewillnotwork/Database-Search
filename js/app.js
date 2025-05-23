// Global variables
let tableManager, searchManager;

// Set up modal close buttons
function setupModalCloseButtons() {
    const modals = document.querySelectorAll('.modal');
    const closeButtons = document.querySelectorAll('.close');
    
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    window.addEventListener('click', (event) => {
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

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

// Set up event listeners
function setupEventListeners() {
    // Get DOM elements
    const fetchDataBtn = document.getElementById('fetchData');
    const loadingEl = document.getElementById('loading');
    const modal = document.getElementById('detailModal');
    const closeModal = document.querySelector('.close');
    
    // Show notification
    function showNotification(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        // You can implement a better notification system here
        if (type === 'error') {
            alert('Error: ' + message);
        } else if (type === 'success') {
            alert('Success: ' + message);
        } else {
            console.log(message);
        }
    }
    
    // Parse a single CSV line, handling quoted values with commas
    function parseCSVLine(line) {
        const values = [];
        let inQuotes = false;
        let currentValue = '';
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(currentValue.trim().replace(/^"/, '').replace(/"$/, ''));
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        
        // Add the last value
        values.push(currentValue.trim().replace(/^"/, '').replace(/"$/, ''));
        
        return values;
    }
    
    // Parse CSV data into an array of objects
    function parseCSV(csvData) {
        const lines = csvData.split('\n');
        if (lines.length < 2) return [];
        
        // Extract headers (first line)
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"/, '').replace(/"$/, ''));
        
        // Process data rows
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue; // Skip empty lines
            
            const values = parseCSVLine(lines[i]);
            const row = {};
            
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            
            data.push(row);
        }
        
        return data;
    }
    
    // Load data from localStorage if available
    function loadFromLocalStorage() {
        try {
            const storedData = window.storageManager.getData();
            
            if (storedData && storedData.data && storedData.data.length > 0) {
                tableManager.setData(storedData.data);
                console.log('Loaded data from local storage');
                return true;
            }
        } catch (error) {
            console.error('Error loading from localStorage:', error);
        }
        
        return false;
    }
    
    // Function to show loading overlay
    function showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
    }

    // Function to hide loading overlay
    function hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
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
                    throw new Error('Invalid URL in the link file');
                }
                
                // Parse the URL and construct the base URL
                const urlObj = new URL(url);
                const baseUrl = `${urlObj.origin}${urlObj.pathname}`;
                
                // Check if this is a Google Sheets URL
                if (url.includes('docs.google.com/spreadsheets/')) {
                    // For Google Sheets, we'll use the direct export URL
                    // Extract the document ID from the URL
                    const docIdMatch = url.match(/\/d\/([^\/]+)/);
                    if (!docIdMatch) {
                        throw new Error('Could not extract document ID from Google Sheets URL');
                    }
                    const docId = docIdMatch[1];
                    
                    // Construct the export URL for the first sheet
                    const exportUrl = `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&gid=0`;
                    
                    // For now, we'll just use the first sheet
                    // In a real implementation, you might want to fetch the sheet list first
                    return fetchCSVData(exportUrl);
                } else {
                    // For direct CSV URLs, use as is
                    return fetchCSVData(url);
                }
            })
            .catch(error => {
                console.error('Error in fetchDataFromGoogleSheets:', error);
                showNotification(`Error: ${error.message}`, 'error');
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
            
            // Create a clean URL with minimal parameters
            const metadataUrl = `${baseUrl}?gid=0&output=csv`;
            
            // Use fetch with minimal headers
            fetch(metadataUrl, {
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(csvData => {
                // Extract sheet names from the first row
                const firstLine = csvData.split('\n')[0];
                const headers = firstLine.split(',');
                
                // Clear loading message
                sheetList.innerHTML = '';
                
                // Add sheet items
                headers.forEach((sheetName, index) => {
                    if (sheetName.trim()) {
                        const sheetItem = document.createElement('div');
                        sheetItem.className = 'sheet-item';
                        sheetItem.textContent = sheetName.trim();
                        sheetItem.onclick = () => {
                            // Update the main title with the sheet name
                            const mainTitle = document.getElementById('mainTitle');
                            if (mainTitle) {
                                mainTitle.textContent = `Search Your Data In - ${sheetName.trim()}`;
                            }
                            
                            // Close the modal and resolve with the selected sheet URL
                            sheetModal.style.display = 'none';
                            resolve(`${baseUrl}?gid=${index}&output=csv`);
                        };
                        sheetList.appendChild(sheetItem);
                    }
                });
            })
            .catch(error => {
                console.error('Error fetching sheet names:', error);
                sheetList.innerHTML = `
                    <div class="error">
                        Error loading sheets. ${error.message}
                        <button onclick="window.location.reload()" class="btn" style="margin-top: 10px;">
                            Try Again
                        </button>
                    </div>`;
                resolve(null);
            });
        });
    }
    
    // Fetch CSV data from URL with minimal headers
    function fetchCSVData(url) {
        // Clean up URL to prevent header size issues
        const cleanUrl = new URL(url);
        cleanUrl.searchParams.forEach((value, key) => {
            if (key !== 'gid' && key !== 'output') {
                cleanUrl.searchParams.delete(key);
            }
        });
        
        return fetch(cleanUrl.toString(), {
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(csvData => {
            // Parse CSV data
            const data = parseCSV(csvData);
            
            // Update the table with the new data
            if (tableManager && typeof tableManager.setData === 'function') {
                tableManager.setData(data);
            }
            
            // Save to localStorage
            if (window.storageManager && typeof window.storageManager.setData === 'function') {
                window.storageManager.setData(data);
            }
            
            // Show success message
            showNotification('Data loaded successfully!', 'success');
            
            return data;
        })
        .catch(error => {
            console.error('Error fetching CSV data:', error);
            showNotification(`Error loading data: ${error.message}`, 'error');
            throw error; // Re-throw to be caught by the caller
        });
    }
    
    // Close modal when clicking the close button
    if (closeModal && modal) {
        closeModal.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }
    
    // Close modal when clicking outside the modal content
    if (modal) {
        window.addEventListener('click', function(event) {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    // Add event listener for fetch data button
    if (fetchDataBtn) {
        fetchDataBtn.addEventListener('click', fetchDataFromGoogleSheets);
    }
    
    // Try to load data from localStorage on page load
    if (!loadFromLocalStorage()) {
        // No data in localStorage, show message
        console.log('No data found in localStorage. Click "Fetch Data" to load from Google Sheets.');
    }
}
