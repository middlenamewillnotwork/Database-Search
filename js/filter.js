class FilterManager {
    constructor(tableManager) {
        this.tableManager = tableManager;
        this.activeFilters = new Map();
        this.initialize();
    }

    initialize() {
        try {
            // Get DOM elements
            this.elements = {
                filterBtn: document.getElementById('filterBtn'),
                filterDropdown: document.getElementById('filterDropdown'),
                closeFilter: document.getElementById('closeFilter'),
                filterOptions: document.getElementById('filterOptions'),
                activeFilters: document.getElementById('activeFilters')
            };

            if (!this.elements.filterBtn) {
                throw new Error('Filter button not found');
            }
            if (!this.elements.filterDropdown) {
                throw new Error('Filter dropdown not found');
            }

            // Bind events
            this.bindEvents();
            
            // Initialize with table data if available
            if (this.tableManager.data && this.tableManager.data.length > 0) {
                this.initializeFilters();
            }
        } catch (error) {
            console.error('Error initializing FilterManager:', error);
            throw error; // Re-throw to be caught by the caller
        }
    }


    bindEvents() {
        try {
            // Toggle dropdown when clicking the filter button
            if (this.elements.filterBtn) {
                this.elements.filterBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleFilterDropdown();
                });
            }

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (this.isDropdownVisible() && 
                    !this.elements.filterDropdown.contains(e.target) && 
                    !this.elements.filterBtn.contains(e.target)) {
                    this.hideFilterDropdown();
                }
            });

            // Close button
            if (this.elements.closeFilter) {
                this.elements.closeFilter.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.hideFilterDropdown();
                });
            }

            // Close on ESC key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isDropdownVisible()) {
                    this.hideFilterDropdown();
                }
            });
        } catch (error) {
            console.error('Error binding filter events:', error);
        }
    }

    toggleFilterDropdown() {
        this.elements.filterDropdown.classList.toggle('visible');
        
        if (this.elements.filterDropdown.classList.contains('visible')) {
            this.initializeFilters();
        }
    }

    hideFilterDropdown() {
        this.elements.filterDropdown.classList.remove('visible');
    }
    
    // Check if dropdown is currently visible
    isDropdownVisible() {
        return this.elements.filterDropdown && 
               this.elements.filterDropdown.classList.contains('visible');
    }

    initializeFilters() {
        if (!this.tableManager.data || this.tableManager.data.length === 0) {
            return;
        }

        // Get unique column headers
        const headers = this.tableManager.headers || Object.keys(this.tableManager.data[0] || {});
        
        // Generate filter options
        let filterHtml = '';
        
        headers.forEach(header => {
            if (!header) return;
            
            // Get filtered unique values for this column based on other active filters
            const values = this.getFilteredValues(header);
            
            filterHtml += `
                <div class="filter-option">
                    <div class="filter-option-header">
                        <span>${header}</span>
                        <span class="toggle-arrow">▼</span>
                    </div>
                    <div class="filter-option-values">
                        ${values.slice(0, 100).map(value => `
                            <div class="filter-value">
                                <input type="checkbox" id="filter-${header}-${this.escapeId(value)}" 
                                       data-column="${header}" value="${this.escapeHtml(value)}"
                                       ${this.isFilterActive(header, value) ? 'checked' : ''}>
                                <label for="filter-${header}-${this.escapeId(value)}">${value || '(empty)'}</label>
                            </div>
                        `).join('')}
                        ${values.length > 100 ? '<div class="text-muted">...and ' + (values.length - 100) + ' more</div>' : ''}
                    </div>
                </div>
            `;
        });

        this.elements.filterOptions.innerHTML = filterHtml;
        
        // Add event listeners for filter options
        this.elements.filterOptions.querySelectorAll('.filter-option-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const values = header.nextElementSibling;
                values.classList.toggle('visible');
                header.querySelector('.toggle-arrow').textContent = 
                    values.classList.contains('visible') ? '▲' : '▼';
            });
        });

        // Add change listeners for checkboxes
        this.elements.filterOptions.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => this.handleFilterChange(e));
        });
    }
    
    // Helper function to escape HTML special characters
    escapeHtml(unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        return String(unsafe)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    
    // Helper function to create safe IDs
    escapeId(unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        return String(unsafe)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
    
    // Check if a specific filter is active
    isFilterActive(column, value) {
        return this.activeFilters.has(column) && this.activeFilters.get(column).has(value);
    }
    
    // Get filtered unique values for a column based on other active filters
    getFilteredValues(column) {
        // Start with all data
        let filteredData = [...this.tableManager.data];
        
        // Apply all active filters except the current column
        this.activeFilters.forEach((values, filterColumn) => {
            if (filterColumn !== column) {
                filteredData = filteredData.filter(item => 
                    values.has(String(item[filterColumn]))
                );
            }
        });
        
        // Get unique values for the specified column
        const uniqueValues = [...new Set(filteredData.map(item => item[column]))];
        
        // Sort values (you can customize the sorting logic as needed)
        return uniqueValues.sort((a, b) => {
            if (a === null || a === undefined) return 1;
            if (b === null || b === undefined) return -1;
            return String(a).localeCompare(String(b));
        });
    }

    handleFilterChange(e) {
        const checkbox = e.target;
        const column = checkbox.dataset.column;
        const value = checkbox.value;
        
        if (!this.activeFilters.has(column)) {
            this.activeFilters.set(column, new Set());
        }
        
        const columnFilters = this.activeFilters.get(column);
        
        if (checkbox.checked) {
            columnFilters.add(value);
        } else {
            columnFilters.delete(value);
            if (columnFilters.size === 0) {
                this.activeFilters.delete(column);
            }
        }
        
        // Update the filter dropdown to reflect the new filter state
        this.initializeFilters();
        
        // Update the active filters display and apply the filters
        this.updateActiveFiltersDisplay();
        this.applyFilters();
    }
    
    updateActiveFiltersDisplay() {
        try {
            const activeFiltersEl = this.elements.activeFilters;
            if (!activeFiltersEl) {
                console.error('activeFilters element not found in the DOM');
                return;
            }
            
            // Clear existing filters
            activeFiltersEl.innerHTML = '';
            
            // If no active filters, don't show anything
            if (this.activeFilters.size === 0) {
                return;
            }
            
            // Create a container for active filters
            const filtersContainer = document.createElement('div');
            filtersContainer.className = 'active-filters-container';
            
            // Add a title
            const title = document.createElement('div');
            title.className = 'active-filters-title';
            title.textContent = 'Active Filters:';
            filtersContainer.appendChild(title);
            
            // Add each active filter as a tag
            this.activeFilters.forEach((values, column) => {
                values.forEach(value => {
                    try {
                        const filterTag = document.createElement('div');
                        filterTag.className = 'filter-tag';
                        
                        // Create elements manually instead of using innerHTML for better performance
                        const tagText = document.createElement('span');
                        tagText.className = 'filter-tag-text';
                        tagText.textContent = `${column}: ${value}`;
                        
                        const removeBtn = document.createElement('span');
                        removeBtn.className = 'filter-tag-remove';
                        removeBtn.setAttribute('data-column', column);
                        removeBtn.setAttribute('data-value', value);
                        removeBtn.innerHTML = '&times;';
                        removeBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            this.removeFilter(column, value);
                        });
                        
                        filterTag.appendChild(tagText);
                        filterTag.appendChild(removeBtn);
                        filtersContainer.appendChild(filterTag);
                    } catch (error) {
                        console.error('Error creating filter tag:', error);
                    }
                });
            });
            
            // Add clear all button
            const clearAllBtn = document.createElement('button');
            clearAllBtn.className = 'clear-all-btn';
            clearAllBtn.textContent = 'Clear All';
            clearAllBtn.addEventListener('click', () => {
                this.clearAllFilters();
            });
            filtersContainer.appendChild(clearAllBtn);
            
            activeFiltersEl.appendChild(filtersContainer);
            
        } catch (error) {
            console.error('Error in updateActiveFiltersDisplay:', error);
        }
    }
    
    clearAllFilters() {
        try {
            // Clear all active filters
            this.activeFilters.clear();
            
            // Uncheck all checkboxes in the filter dropdown
            const checkboxes = this.elements.filterOptions.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
            
            // Update the display and reapply filters (which will show all data)
            this.updateActiveFiltersDisplay();
            this.applyFilters();
            
            console.log('All filters cleared');
        } catch (error) {
            console.error('Error clearing all filters:', error);
        }
    }
    
    removeFilter(column, value) {
        if (this.activeFilters.has(column)) {
            const values = this.activeFilters.get(column);
            values.delete(value);
            
            if (values.size === 0) {
                this.activeFilters.delete(column);
            }
            
            // Uncheck the corresponding checkbox
            const checkbox = document.querySelector(`input[data-column="${column}"][value="${value}"]`);
            if (checkbox) {
                checkbox.checked = false;
            }
            
            this.updateActiveFiltersDisplay();
            this.applyFilters();
        }
    }
    
    applyFilters() {
        if (!this.tableManager.data) return;
        
        let filteredData = [...this.tableManager.data];
        
        // Apply active filters
        this.activeFilters.forEach((values, column) => {
            filteredData = filteredData.filter(item => 
                values.has(String(item[column]))
            );
        });
        
        // Update the table with filtered data
        this.tableManager.filteredData = filteredData;
        this.tableManager.currentPage = 1;
        this.tableManager.updateTable();
        this.tableManager.updatePagination();
    }
}

// Export the FilterManager class
window.FilterManager = FilterManager;
