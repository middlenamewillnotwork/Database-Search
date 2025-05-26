class FilterManager {
    constructor(tableManager) {
        this.expandedSections = new Set(); // Track which sections are expanded
        this.tableManager = tableManager;
        this.activeFilters = new Map();
        this.elements = {};
        this.initialize();
    }
    
    // Helper to escape HTML special characters
    escapeHtml(unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        return String(unsafe)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    
    // Helper to create a valid HTML ID from a string
    escapeId(unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        return String(unsafe)
            .toLowerCase()
            .replace(/[^a-z0-9_-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
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

        // Track which sections are currently open
        const openSections = new Set();
        if (this.elements.filterOptions) {
            this.elements.filterOptions.querySelectorAll('.filter-option').forEach(option => {
                const header = option.querySelector('.filter-option-header');
                const values = option.querySelector('.filter-option-values');
                if (header && values && (values.classList.contains('visible') || values.style.display === 'block')) {
                    const headerText = header.querySelector('span')?.textContent;
                    if (headerText) openSections.add(headerText);
                }
            });
        }

        // Get unique column headers
        const headers = this.tableManager.headers || Object.keys(this.tableManager.data[0] || {});
        
        // Generate filter options
        let filterHtml = '';
        
        headers.forEach(header => {
            if (!header) return;
            
            // Get filtered unique values for this column based on other active filters
            const values = this.getFilteredValues(header);
            const isOpen = openSections.has(header);
            const isApplied = this.activeFilters.has(header) && this.activeFilters.get(header).size > 0;
            
            filterHtml += `
                <div class="filter-option">
                    <div class="filter-option-header${isApplied ? ' filter-applied' : ''}">
                        <span>${header}</span>
                        <span class="toggle-arrow">${isOpen ? '▲' : '▼'}</span>
                    </div>
                    <div class="filter-option-values${isOpen ? ' visible' : ''}" style="display:${isOpen ? 'block' : 'none'};">
                        ${values.slice(0, 100).map(value => `
                            <div class="filter-value">
                                <input type="checkbox" id="filter-${header}-${this.escapeId(value)}" 
                                       data-column="${header}" value="${this.escapeHtml(value)}"
                                       ${this.isFilterActive(header, value) ? 'checked' : ''}>
                                <label for="filter-${header}-${this.escapeId(value)}">${value || '(empty)'}</label>
                            </div>
                        `).join('')}
                        ${values.length > 100 ? `
                            <div class="show-more-container" style="${this.expandedSections.has(header) ? 'display: none;' : ''}">
                                <a href="#" class="show-more-link" data-header="${header}">Show ${values.length - 100} more...</a>
                            </div>
                            <div class="remaining-values" style="${this.expandedSections.has(header) ? 'display: block;' : 'display: none;'}">
                                ${values.slice(100).map(value => `
                                    <div class="filter-value">
                                        <input type="checkbox" id="filter-${header}-${this.escapeId(value)}" 
                                               data-column="${header}" value="${this.escapeHtml(value)}"
                                               ${this.isFilterActive(header, value) ? 'checked' : ''}>
                                        <label for="filter-${header}-${this.escapeId(value)}">${value || '(empty)'}</label>
                                    </div>
                                `).join('')}
                        ` : ''}
                    </div>
                </div>
            `;
        });

        this.elements.filterOptions.innerHTML = filterHtml;
        
        // Add click handler for Show More links
        this.elements.filterOptions.querySelectorAll('.show-more-link').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const header = e.target.dataset.header;
                const container = e.target.closest('.filter-option-values');
                const remainingValues = container.querySelector('.remaining-values');
                const showMoreContainer = container.querySelector('.show-more-container');
                
                // Toggle the expanded state for this section
                if (remainingValues.style.display === 'none') {
                    remainingValues.style.display = 'block';
                    showMoreContainer.style.display = 'none';
                    this.expandedSections.add(header);
                } else {
                    remainingValues.style.display = 'none';
                    showMoreContainer.style.display = 'block';
                    this.expandedSections.delete(header);
                }
            });
        });
        
        // Add event listeners for filter options
        this.elements.filterOptions.querySelectorAll('.filter-option-header').forEach(header => {
            header.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent the click from closing the dropdown
                const values = header.nextElementSibling;
                values.classList.toggle('visible');
                values.style.display = values.classList.contains('visible') ? 'block' : 'none';
                header.querySelector('.toggle-arrow').textContent = 
                    values.classList.contains('visible') ? '▲' : '▼';
            });
        });

        // Add change listeners for checkboxes
        this.elements.filterOptions.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation(); // Prevent the click from closing the dropdown
                this.handleFilterChange(e);
            });
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
        
        // If no data remains after filtering, return empty array
        if (filteredData.length === 0) {
            return [];
        }
        
        // Get unique values for the specified column
        let uniqueValues = [...new Set(filteredData.map(item => item[column]))];
        
        // Remove null/undefined/empty values
        uniqueValues = uniqueValues.filter(value => 
            value !== null && value !== undefined && value !== ''
        );
        
        // Determine data type for sorting
        const sampleValue = uniqueValues.find(val => val !== null && val !== undefined);
        
        if (sampleValue === undefined) return [];
        
        // Sort based on data type
        const type = this.determineType(sampleValue);
        
        return uniqueValues.sort((a, b) => {
            // Handle null/undefined values
            if (a === null || a === undefined) return 1;
            if (b === null || b === undefined) return -1;
            
            // Sort based on detected type
            switch (type) {
                case 'number':
                    return (parseFloat(a) || 0) - (parseFloat(b) || 0);
                    
                case 'date':
                    return new Date(a) - new Date(b);
                    
                case 'boolean':
                    return (a === b) ? 0 : a ? -1 : 1;
                    
                default: // string and others
                    return String(a).localeCompare(String(b), undefined, {sensitivity: 'base'});
            }
        });
    }
    
    // Helper to determine data type of values in a column
    determineType(value) {
        if (value === null || value === undefined) return 'string';
        
        // Check if it's a boolean
        if (value === true || value === false) return 'boolean';
        
        // Check if it's a number
        if (!isNaN(parseFloat(value)) && isFinite(value)) return 'number';
        
        // Check if it's a date
        const date = new Date(value);
        if (date.toString() !== 'Invalid Date' && !isNaN(date)) {
            // Additional check to avoid false positives for numbers
            if (String(parseFloat(value)) === String(value)) return 'number';
            return 'date';
        }
        
        // Default to string
        return 'string';
    }

    handleFilterChange(e) {
        // Prevent the click from bubbling up to the document
        e.stopPropagation();
        e.preventDefault();
        
        const checkbox = e.target;
        const column = checkbox.dataset.column;
        const value = checkbox.value;
        const wasChecked = checkbox.checked;
        
        // Get the current scroll position and active element
        const filterOptions = this.elements.filterOptions;
        const scrollContainer = filterOptions.closest('.filter-options-container') || filterOptions;
        const scrollPosition = scrollContainer.scrollTop;
        const activeElement = document.activeElement;
        const activeElementId = activeElement?.id;
        
        // Update active filters
        if (!this.activeFilters.has(column)) {
            this.activeFilters.set(column, new Set());
        }
        
        if (wasChecked) {
            this.activeFilters.get(column).add(value);
        } else {
            this.activeFilters.get(column).delete(value);
            if (this.activeFilters.get(column).size === 0) {
                this.activeFilters.delete(column);
            }
        }

        // Apply filters
        this.applyFilters();
        
        // Update active filters display
        this.updateActiveFiltersDisplay();
        
        // Ensure the dropdown stays visible
        if (!this.isDropdownVisible()) {
            this.elements.filterDropdown.classList.add('visible');
        }
        
        // Store which sections are currently expanded
        const expandedSections = new Set();
        this.elements.filterOptions.querySelectorAll('.filter-option').forEach(option => {
            const header = option.querySelector('.filter-option-header');
            const values = option.querySelector('.filter-option-values');
            if (header && values && (values.classList.contains('visible') || values.style.display === 'block')) {
                const headerText = header.querySelector('span')?.textContent;
                if (headerText) expandedSections.add(headerText);
            }
        });
        
        // Refresh filter options
        this.initializeFilters();
        
        // Restore expanded sections
        if (expandedSections.size > 0) {
            this.elements.filterOptions.querySelectorAll('.filter-option').forEach(option => {
                const header = option.querySelector('.filter-option-header span');
                if (header && expandedSections.has(header.textContent)) {
                    const values = option.querySelector('.filter-option-values');
                    const arrow = option.querySelector('.toggle-arrow');
                    if (values && arrow) {
                        values.classList.add('visible');
                        values.style.display = 'block';
                        arrow.textContent = '▼';
                    }
                }
            });
        }
        
        // Restore scroll position and focus after a small delay
        setTimeout(() => {
            // Restore scroll position
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollPosition;
            }
            
            // Try to restore focus to the previously active element
            if (activeElementId) {
                const elementToFocus = document.getElementById(activeElementId);
                if (elementToFocus && elementToFocus.focus) {
                    elementToFocus.focus();
                }
            } else if (activeElement && activeElement.focus) {
                activeElement.focus();
            }
        }, 10);
    }
    
    // Rebuild filter options while maintaining open/closed state of sections
    rebuildFilterOptions(openSections) {
        // Store scroll position
        const scrollTop = this.elements.filterOptions.scrollTop;
        
        // Get current filter values
        const headers = this.tableManager.headers || Object.keys(this.tableManager.data[0] || {});
        let filterHtml = '';
        
        headers.forEach(header => {
            if (!header) return;
            
            const values = this.getFilteredValues(header);
            const isOpen = openSections.has(header);
            
            filterHtml += `
                <div class="filter-option">
                    <div class="filter-option-header">
                        <span>${header}</span>
                        <span class="toggle-arrow">${isOpen ? '▼' : '▶'}</span>
                    </div>
                    <div class="filter-option-values" style="${isOpen ? 'display: block;' : 'display: none;'}">
                        ${values.slice(0, 100).map(value => `
                            <div class="filter-value">
                                <input type="checkbox" id="filter-${header}-${this.escapeId(value)}" 
                                       data-column="${header}" value="${value}"
                                       ${this.isFilterActive(header, value) ? 'checked' : ''}>
                                <label for="filter-${header}-${this.escapeId(value)}">${value || '(empty)'}</label>
                            </div>
                        `).join('')}
                        ${values.length > 100 ? '<div class="text-muted">...and ' + (values.length - 100) + ' more</div>' : ''}
                    </div>
                </div>`;
        });
        
        // Update the DOM
        this.elements.filterOptions.innerHTML = filterHtml;
        
        // Restore scroll position
        this.elements.filterOptions.scrollTop = scrollTop;
        
        // Reattach event listeners
        this.attachFilterOptionListeners();
    }
    
    // Update checkbox states without reinitializing the entire dropdown
    updateCheckboxStates() {
        this.elements.filterOptions.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            const column = checkbox.dataset.column;
            const value = checkbox.value;
            checkbox.checked = this.isFilterActive(column, value);
        });
    }
    
    // Attach event listeners to filter options
    attachFilterOptionListeners() {
        try {
            // Remove existing listeners by cloning and replacing elements
            // For filter option headers
            this.elements.filterOptions.querySelectorAll('.filter-option-header').forEach(header => {
                const newHeader = header.cloneNode(true);
                header.parentNode.replaceChild(newHeader, header);
                
                newHeader.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const values = newHeader.nextElementSibling;
                    const isVisible = window.getComputedStyle(values).display === 'block';
                    values.style.display = isVisible ? 'none' : 'block';
                    const arrow = newHeader.querySelector('.toggle-arrow');
                    if (arrow) {
                        arrow.textContent = isVisible ? '▶' : '▼';
                    }
                });
            });

            // For checkboxes
            this.elements.filterOptions.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                const newCheckbox = checkbox.cloneNode(true);
                checkbox.parentNode.replaceChild(newCheckbox, checkbox);
                
                newCheckbox.addEventListener('change', (e) => {
                    e.stopPropagation();
                    // Store the current state to prevent infinite loops
                    const currentState = {
                        column: newCheckbox.dataset.column,
                        value: newCheckbox.value,
                        checked: newCheckbox.checked
                    };
                    
                    // Call handleFilterChange with the event
                    this.handleFilterChange(e, currentState);
                });
            });
        } catch (error) {
            console.error('Error attaching filter option listeners:', error);
        }
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
        this.tableManager.baseFilteredData = filteredData;
        // If there is an active search query, apply it to filtered data
        if (this.tableManager.searchQuery && this.tableManager.searchQuery.length > 0) {
            this.tableManager.filterData(this.tableManager.searchQuery);
        } else {
            this.tableManager.filteredData = filteredData;
            this.tableManager.currentPage = 1;
            this.tableManager.updateTable();
            this.tableManager.updatePagination();
        }
    }
}

// Export the FilterManager class
window.FilterManager = FilterManager;
