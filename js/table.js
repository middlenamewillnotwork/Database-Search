// Table management class
class TableManager {
    constructor() {
        this.table = document.getElementById('dataTable');
        this.tableBody = document.getElementById('tableBody');
        this.tableHeader = document.getElementById('tableHeader');
        this.prevBtn = document.getElementById('prevPage');
        this.nextBtn = document.getElementById('nextPage');
        this.pageInfo = document.getElementById('pageInfo');
        this.totalRecordsEl = document.getElementById('totalRecords');
        this.loadingEl = document.getElementById('loading');
        
        this.data = [];
        this.filteredData = [];
        this.currentPage = 1;
        this.rowsPerPage = 50;
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.headers = [];
    }
    
    initialize() {
        // Event listeners for pagination
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => this.prevPage());
        }
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.nextPage());
        }
        
        // Setup back to top button
        this.setupBackToTopButton();
    }
    
    // Setup Back to Top button
    setupBackToTopButton() {
        const backToTopButton = document.getElementById('backToTopBtn');
        if (!backToTopButton) return;
        
        window.onscroll = () => {
            const scrollPosition = window.innerHeight + window.scrollY;
            const bottomPosition = document.documentElement.offsetHeight - 100;
            backToTopButton.style.display = scrollPosition >= bottomPosition ? 'block' : 'none';
        };
        
        backToTopButton.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    
    // Set the data and initialize the table
    setData(data) {
        // Handle both old and new data formats
        if (data && data.data) {
            // New format: { data: [...], source: {...} }
            this.data = data.data;
            // Update the header with the data source info if available
            if (data.source && data.source.name) {
                const header = document.querySelector('h1');
                if (header) {
                    header.textContent = `Database Search - ${data.source.name}`;
                }
            }
        } else {
            // Old format: just the data array
            this.data = data;
        }
        
        this.filteredData = [...this.data];
        this.headers = this.data.length > 0 ? Object.keys(this.data[0]) : [];
        this.currentPage = 1;
        this.renderHeader();
        this.updateTable();
        this.updatePagination();
    }
    
    // Filter data based on search query
    filterData(query) {
        if (!query) {
            this.filteredData = [...this.data];
        } else {
            const lowerQuery = query.toLowerCase();
            this.filteredData = this.data.filter(item => 
                Object.values(item).some(value => 
                    String(value).toLowerCase().includes(lowerQuery)
                )
            );
        }
        
        this.currentPage = 1;
        this.updateTable();
        this.updatePagination();
    }
    
    // Render table header
    renderHeader() {
        this.tableHeader.innerHTML = '';
        
        this.headers.forEach((header, index) => {
            const th = document.createElement('th');
            th.textContent = header;
            th.dataset.column = index;
            th.addEventListener('click', () => this.sortTable(index));
            this.tableHeader.appendChild(th);
        });
    }
    
    // Sort table by column
    sortTable(columnIndex) {
        const column = this.headers[columnIndex];
        
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }
        
        // Update sort indicators
        this.updateSortIndicators();
        
        // Sort the data
        this.filteredData.sort((a, b) => {
            let aValue = a[this.sortColumn];
            let bValue = b[this.sortColumn];
            
            // Convert to string and handle case for consistent comparison
            aValue = String(aValue || '').toLowerCase();
            bValue = String(bValue || '').toLowerCase();
            
            if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
        
        this.updateTable();
    }
    
    // Update sort indicators in the header
    updateSortIndicators() {
        const headers = this.tableHeader.getElementsByTagName('th');
        
        for (let i = 0; i < headers.length; i++) {
            const header = headers[i];
            header.classList.remove('sort-asc', 'sort-desc');
            
            if (i === this.headers.indexOf(this.sortColumn)) {
                header.classList.add(`sort-${this.sortDirection}`);
            }
        }
    }
    
    // Update the table with current data and pagination
    updateTable() {
        if (!this.tableBody) return;
        
        this.renderTable();
        this.scrollToPagination();
    }
    
    // Scroll to the pagination controls with a smooth downward animation
    scrollToPagination() {
        const paginationContainer = document.querySelector('.pagination-container');
        if (!paginationContainer) return;
        
        // First, scroll to the top of the table
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer) {
            tableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
        // Then after a short delay, scroll to the pagination
        setTimeout(() => {
            paginationContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 300);
    }
    
    renderTable() {
        if (!this.tableBody) return;
        
        // Show loading state
        if (this.loadingEl) {
            this.loadingEl.style.display = 'block';
        }
        
        // Use setTimeout to allow the UI to update before heavy processing
        setTimeout(() => {
            try {
                // Clear existing rows
                this.tableBody.innerHTML = '';
                
                // Calculate pagination
                const start = (this.currentPage - 1) * this.rowsPerPage;
                const end = start + this.rowsPerPage;
                const paginatedData = this.filteredData.slice(start, end);
                
                // Render rows
                paginatedData.forEach((row, index) => {
                    const tr = document.createElement('tr');
                    
                    // Add data attributes for searching/sorting
                    Object.entries(row).forEach(([key, value]) => {
                        try {
                            // Convert key to a valid HTML attribute name
                            // Replace spaces and special characters with hyphens and make lowercase
                            const attrName = key.toLowerCase()
                                .replace(/[^a-z0-9\s-]/g, '') // Remove invalid characters
                                .trim() // Trim whitespace
                                .replace(/\s+/g, '-') // Replace spaces with hyphens
                                .replace(/-+/g, '-') // Replace multiple hyphens with one
                                .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
                            
                            if (attrName) { // Only set the attribute if we have a valid name
                                tr.setAttribute(`data-${attrName}`, String(value).toLowerCase());
                            }
                        } catch (e) {
                            console.warn(`Could not set attribute for column: ${key}`, e);
                        }
                    });
                    
                    // Create cells
                    Object.values(row).forEach(cellValue => {
                        const td = document.createElement('td');
                        td.textContent = cellValue !== null && cellValue !== undefined ? cellValue : '';
                        tr.appendChild(td);
                    });
                    
                    // Add click handler for row details
                    tr.addEventListener('click', () => this.showRowDetails(row));
                    
                    this.tableBody.appendChild(tr);
                });
                
                // Update pagination
                this.updatePagination();
                
            } catch (error) {
                console.error('Error rendering table:', error);
            } finally {
                // Hide loading state
                if (this.loadingEl) {
                    this.loadingEl.style.display = 'none';
                }
            }
        }, 0);
    }
    
    // Close modal helper function
    closeModal() {
        const modal = document.getElementById('detailModal');
        if (modal) {
            modal.style.display = 'none';
            // Remove the keydown event listener when modal is closed
            document.removeEventListener('keydown', this.boundHandleEscKey);
        }
    }

    // Handle ESC key press
    handleEscKey(event) {
        if (event.key === 'Escape' || event.key === 'Esc') {
            this.closeModal();
        }
    }

    // Show row details in modal with table format
    showRowDetails(row) {
        const modal = document.getElementById('detailModal');
        const modalContent = document.getElementById('modalContent');
        
        if (!modal || !modalContent) return;
        
        // Create table for row details
        let detailsHtml = `
            <table class="modal-table">
                <tbody>`;
        
        // Add each row as a table row
        for (const [key, value] of Object.entries(row)) {
            const displayValue = value !== null && value !== undefined && value !== '' ? value : '-';
            const valueId = `value-${key.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            
            detailsHtml += `
                <tr>
                    <th>${key}</th>
                    <td>
                        <div class="value-container">
                            <span id="${valueId}">${displayValue}</span>
                            <button class="copy-btn" data-target="${valueId}" title="Copy to clipboard" aria-label="Copy to clipboard">
                                <i class="far fa-copy"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
        }
        
        detailsHtml += `
                </tbody>
            </table>`;
        
        modalContent.innerHTML = detailsHtml;
        modal.style.display = 'block';
        
        // Add copy functionality
        this.setupCopyButtons();
        
        // Close modal when clicking the close button
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) {
            closeBtn.onclick = () => this.closeModal();
        }
        
        // Close modal when clicking outside the content
        modal.onclick = (event) => {
            if (event.target === modal) {
                this.closeModal();
            }
        };
        
        // Add ESC key functionality
        // Store the bound function reference so we can remove it later
        this.boundHandleEscKey = (e) => this.handleEscKey(e);
        document.addEventListener('keydown', this.boundHandleEscKey);
    }
    
    // Setup copy buttons functionality
    setupCopyButtons() {
        const copyButtons = document.querySelectorAll('.copy-btn');
        
        copyButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering row click
                const targetId = button.getAttribute('data-target');
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    const textToCopy = targetElement.textContent;
                    
                    // Create a temporary textarea to copy from
                    const textarea = document.createElement('textarea');
                    textarea.value = textToCopy;
                    document.body.appendChild(textarea);
                    textarea.select();
                    
                    try {
                        // Copy the text
                        document.execCommand('copy');
                        
                        // Show checkmark icon when copied
                        const originalIcon = button.innerHTML;
                        button.innerHTML = '<i class="fas fa-check"></i>';
                        button.classList.add('copied');
                        
                        // Reset button after 2 seconds
                        setTimeout(() => {
                            button.innerHTML = originalIcon;
                            button.classList.remove('copied');
                        }, 2000);
                        
                    } catch (err) {
                        console.error('Failed to copy text: ', err);
                    } finally {
                        // Clean up
                        document.body.removeChild(textarea);
                    }
                }
            });
        });
    }
    
    // Update total records display
    updateTotalRecords() {
        if (this.totalRecordsEl) {
            this.totalRecordsEl.textContent = this.filteredData.length;
        }
    }
    
    // Update page info
    updatePagination() {
        const totalPages = Math.ceil(this.filteredData.length / this.rowsPerPage);
        
        // Update page info
        if (this.pageInfo) {
            this.pageInfo.textContent = `Page ${this.currentPage} of ${totalPages || 1}`;
        }
        
        // Update total records display
        this.updateTotalRecords();
        
        // Update button states
        if (this.prevBtn) this.prevBtn.disabled = this.currentPage <= 1;
        if (this.nextBtn) this.nextBtn.disabled = this.currentPage >= totalPages || totalPages === 0;
        
        // Update page jump controls
        const pageJumpContainer = document.querySelector('.page-jump-container');
        if (pageJumpContainer) {
            // Create select element
            const select = document.createElement('select');
            select.className = 'page-select';
            select.setAttribute('aria-label', 'Select page');
            
            // Add options for each page
            for (let i = 1; i <= totalPages; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `Page ${i}`;
                if (i === this.currentPage) {
                    option.selected = true;
                }
                select.appendChild(option);
            }
            
            // Clear existing content and add the select
            pageJumpContainer.innerHTML = '';
            pageJumpContainer.appendChild(select);
            
            // Add event listener for the select
            select.addEventListener('change', (e) => {
                const pageNum = parseInt(e.target.value);
                if (pageNum >= 1 && pageNum <= totalPages) {
                    this.goToPage(pageNum);
                }
            });
        }
    }
    
    // Show loading state
    showLoading() {
        this.loadingEl.style.display = 'block';
        this.tableBody.innerHTML = '';
    }
    
    // Hide loading state
    hideLoading() {
        this.loadingEl.style.display = 'none';
    }
    
    // Go to previous page
    prevPage() {
        if (this.currentPage > 1) {
            const tableContainer = document.querySelector('.table-container');
            const scrollPosition = tableContainer ? tableContainer.scrollTop : 0;
            
            this.currentPage--;
            this.updateTable();
            
            if (tableContainer) {
                setTimeout(() => {
                    tableContainer.scrollTop = scrollPosition;
                }, 0);
            }
        }
    }
    
    // Go to next page
    nextPage() {
        const totalPages = Math.ceil(this.filteredData.length / this.rowsPerPage);
        if (this.currentPage < totalPages) {
            const tableContainer = document.querySelector('.table-container');
            const scrollPosition = tableContainer ? tableContainer.scrollTop : 0;
            
            this.currentPage++;
            this.updateTable();
            
            if (tableContainer) {
                setTimeout(() => {
                    tableContainer.scrollTop = scrollPosition;
                }, 0);
            }
        }
    }
    
    // Go to specific page
    goToPage(pageNum) {
        const totalPages = Math.ceil(this.filteredData.length / this.rowsPerPage);
        if (pageNum >= 1 && pageNum <= totalPages) {
            const tableContainer = document.querySelector('.table-container');
            const scrollPosition = tableContainer ? tableContainer.scrollTop : 0;
            
            this.currentPage = pageNum;
            this.updateTable();
            
            if (tableContainer) {
                setTimeout(() => {
                    tableContainer.scrollTop = scrollPosition;
                }, 0);
            }
        }
    }
}

// Create a global instance
window.tableManager = new TableManager();
