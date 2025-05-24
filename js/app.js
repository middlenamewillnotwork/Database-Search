// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize table manager first
    const tableManager = window.tableManager || new TableManager();
    window.tableManager = tableManager;
    
    // Initialize search manager
    const searchManager = window.searchManager || new SearchManager(tableManager);
    window.searchManager = searchManager;
    
    // Initialize the table
    tableManager.initialize();
    
    // Initialize filter manager after a short delay to ensure DOM is ready
    setTimeout(() => {
        try {
            window.filterManager = new FilterManager(tableManager);
        } catch (error) {
            console.error('Error initializing FilterManager:', error);
        }
    }, 300);
    
    // Get DOM elements
    const fetchDataBtn = document.getElementById('fetchData');
    const dataSourceSelect = document.getElementById('dataSourceSelect');
    const loadingEl = document.getElementById('loading');
    const modal = document.getElementById('detailModal');
    const closeModal = document.querySelector('.close');
    
    // Load configuration
    let config = { sheets: [] };
    let selectedDataSourceIndex = -1;
    const dataSourceList = document.getElementById('dataSourceList');
    const dataSourceItems = document.querySelector('.data-source-items');
    
    async function loadConfig() {
        try {
            const response = await fetch('config.json');
            if (response.ok) {
                config = await response.json();
                // Configuration loaded successfully
                
                // Populate data source list
                if (config.sheets && config.sheets.length > 0) {
                    dataSourceItems.innerHTML = ''; // Clear any existing items
                    
                    config.sheets.forEach((sheet, index) => {
                        if (sheet.name && sheet.url) {
                            const item = document.createElement('div');
                            item.className = 'data-source-item';
                            item.textContent = sheet.name;
                            item.dataset.index = index;
                            
                            item.addEventListener('click', () => {
                                // Remove active class from all items
                                document.querySelectorAll('.data-source-item').forEach(i => {
                                    i.classList.remove('active');
                                });
                                
                                // Set active class on clicked item
                                item.classList.add('active');
                                selectedDataSourceIndex = index;
                                
                                // Hide the list
                                dataSourceList.classList.remove('show');
                                
                                // Set the selected data source
                                selectedDataSourceIndex = index;
                                // Disable button during fetch
                                if (fetchDataBtn) {
                                    fetchDataBtn.disabled = true;
                                }
                                // Automatically fetch data for the selected source
                                fetchDataFromGoogleSheets();
                            });
                            
                            dataSourceItems.appendChild(item);
                        }
                    });
                }
            } else {
                console.error('Failed to load config.json');
            }
        } catch (error) {
            console.error('Error loading configuration:', error);
        }
    }
    
    // Load the configuration
    await loadConfig();
    
    // Initialize dropdown elements
    
    // Initialize dropdown state
    let isDropdownOpen = false;
    
    // Toggle data source list when fetch button is clicked
    if (fetchDataBtn && dataSourceList) {
        // Function to show dropdown
        const showDropdown = () => {
            // Showing dropdown
            dataSourceList.style.display = 'block';
            setTimeout(() => {
                dataSourceList.classList.add('show');
                isDropdownOpen = true;
                document.body.classList.add('dropdown-open');
            }, 10);
        };
        
        // Function to hide dropdown
        const hideDropdown = () => {
            console.log('Hiding dropdown');
            dataSourceList.classList.remove('show');
            isDropdownOpen = false;
            document.body.classList.remove('dropdown-open');
            
            // Remove display:block after transition
            setTimeout(() => {
                if (!isDropdownOpen) {
                    dataSourceList.style.display = '';
                }
            }, 200);
        };
        
        // Toggle dropdown on button click
        const toggleDropdown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (isDropdownOpen) {
                hideDropdown();
            } else {
                showDropdown();
            }
        };
        
        // Add click handler to the button
        fetchDataBtn.addEventListener('click', toggleDropdown);
        
        // Close when clicking outside
        document.addEventListener('mousedown', (e) => {
            const isClickInside = dataSourceList.contains(e.target) || fetchDataBtn.contains(e.target);
            if (!isClickInside && isDropdownOpen) {
                hideDropdown();
            }
        });
        
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isDropdownOpen) {
                hideDropdown();
            }
        });
    }
    
    // Close the dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (dataSourceList && 
            !dataSourceList.contains(e.target) && 
            e.target !== fetchDataBtn && 
            !fetchDataBtn.contains(e.target)) {
            dataSourceList.classList.remove('show');
        }
    });
    
    // Handle clicks on data source items
    if (dataSourceItems) {
        dataSourceItems.addEventListener('click', function(e) {
            const item = e.target.closest('.data-source-item');
            if (item) {
                e.stopPropagation();
                // The rest of the item click handling is done in the loadConfig function
            }
        });
    }
    
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
                values.push(currentValue.trim().replace(/^"|"$/g, ''));
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        
        // Add the last value
        values.push(currentValue.trim().replace(/^"|"$/g, ''));
        
        return values;
    }
    
    // Parse CSV data into an array of objects
    function parseCSV(csvData) {
        const lines = csvData.split('\n');
        if (lines.length < 2) return [];
        
        // Extract headers (first line)
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        
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
            
            if (storedData) {
                // Handle both old and new data formats
                const data = storedData.data || storedData;
                const source = storedData.source;
                
                if (data && data.length > 0) {
                    tableManager.setData(data);
                    
                    // Update the header with the stored source name if available
                    if (source && source.name) {
                        const header = document.querySelector('h1');
                        if (header) {
                            header.innerHTML = `Search Your Data In - <span class="data-source-name">${source.name}</span>`;
                        }
                        
                        // Update the selected data source index
                        if (source.index !== undefined) {
                            selectedDataSourceIndex = source.index;
                        }
                    }
                    
                    console.log('Loaded data from local storage');
                    return true;
                }
            }
        } catch (error) {
            console.error('Error loading from localStorage:', error);
        }
        
        return false;
    }
    
    // Function to manage loading overlay
    function showLoading(show = true) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }

    // Alias for showLoading(false) for backward compatibility
    function hideLoading() {
        showLoading(false);
    }

    // Fetch data from Google Sheets
    function fetchDataFromGoogleSheets() {
        if (selectedDataSourceIndex === -1 || !config.sheets[selectedDataSourceIndex]) {
            return;
        }

        // If no data source is selected, show the list
        if (selectedDataSourceIndex === -1) {
            showDataSourceList();
            return;
        }

        const selectedSheet = config.sheets[selectedDataSourceIndex];
        const sheetUrl = selectedSheet.url;
        
        if (!sheetUrl) {
            throw new Error('No URL configured for the selected data source');
        }
        
        // Show loading states
        showLoading(true);
        if (tableManager) {
            tableManager.showLoading();
        }
        
        // Disable button during fetch
        if (fetchDataBtn) {
            fetchDataBtn.disabled = true;
        }

        fetch(sheetUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(csvData => {
                try {
                    // Parse CSV data
                    const results = Papa.parse(csvData, {
                        header: true,
                        skipEmptyLines: true,
                        transform: (value) => value === '' ? null : value
                    });

                    if (results.errors && results.errors.length > 0) {
                        throw new Error('Error parsing CSV: ' + results.errors[0].message);
                    }

                    const data = results.data;

                    if (!data || data.length === 0) {
                        throw new Error('No data found in the selected sheet.');
                    }

                    // Store the data in localStorage with source info
                    const dataToStore = {
                        data: data,
                        source: {
                            name: selectedSheet.name,
                            index: selectedDataSourceIndex,
                            timestamp: new Date().toISOString()
                        }
                    };
                    
                    window.storageManager.saveData(dataToStore);
                    
                    // Update the table with new data
                    tableManager.setData(data);
                    
                    // Update the header
                    const header = document.querySelector('h1');
                    if (header) {
                        header.innerHTML = `Search Your Data In - <span class="data-source-name">${selectedSheet.name}</span>`;
                    }
                    
                    // Show success message
                    showNotification(`Data loaded successfully from ${selectedSheet.name}`, 'success');
                    
                    return data;
                } catch (error) {
                    console.error('Error processing data:', error);
                    throw error; // Re-throw to be caught by the catch block
                }
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                showNotification(`Error: ${error.message}`, 'error');
            })
            .finally(() => {
                // Always execute cleanup
                if (fetchDataBtn) {
                    fetchDataBtn.disabled = false;
                }
                showLoading(false);
                if (tableManager) {
                    tableManager.hideLoading();
                }
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
    
    // Add event listener for fetch data button - only to toggle the dropdown
    if (fetchDataBtn) {
        fetchDataBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dataSourceList.classList.toggle('show');
        });
    }
    
    // Try to load data from localStorage on page load
    const loadedFromStorage = loadFromLocalStorage();
    if (loadedFromStorage) {
        // If we have a last selected data source, select it
        const lastSelected = localStorage.getItem('lastSelectedDataSource');
        if (lastSelected && dataSourceSelect) {
            dataSourceSelect.value = lastSelected;
            fetchDataBtn.disabled = false;
        }
    } else {
        // No data in localStorage, show message
        console.log('No data found in localStorage. Select a data source and click "Fetch Data" to load.');
    }
});
