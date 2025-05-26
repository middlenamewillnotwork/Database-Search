// Search functionality class
class SearchManager {
    constructor(tableManager) {
        this.searchInput = document.getElementById('searchInput');
        this.suggestionsEl = document.getElementById('suggestions');
        this.tableManager = tableManager;
        
        // Debounce the search to improve performance
        this.debounceTimer = null;
        this.debounceDelay = 300;
        
        // Track the current search query
        this.tableManager.searchQuery = '';
        
        if (this.searchInput && this.suggestionsEl) {
            this.initialize();
        }
    }
    
    initialize() {
        // Event listeners for search input
        this.searchInput.addEventListener('input', () => this.handleSearchInput());
        this.searchInput.addEventListener('focus', () => this.showSuggestions());
        
        // Close suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.searchInput.contains(e.target) && !this.suggestionsEl.contains(e.target)) {
                this.hideSuggestions();
            }
        });
        
        // Handle keyboard events
        this.searchInput.addEventListener('keydown', (e) => {
            // Close suggestions on ESC key
            if (e.key === 'Escape') {
                this.hideSuggestions();
                // Don't prevent default to allow other ESC key behaviors to work
            }
        });
    }
    
    // Handle search input with debounce
    handleSearchInput() {
        clearTimeout(this.debounceTimer);
        
        this.debounceTimer = setTimeout(() => {
            const query = this.searchInput.value.trim();
            this.tableManager.searchQuery = query; // Keep the current search query in sync
            this.tableManager.filterData(query);
            
            // Show suggestions if there's a query
            if (query.length > 0) {
                this.showSuggestions(query);
            } else {
                this.hideSuggestions();
            }
        }, this.debounceDelay);
    }
    
    // Show search suggestions
    showSuggestions(query = '') {
        if (!this.tableManager.baseFilteredData || this.tableManager.baseFilteredData.length === 0) {
            this.hideSuggestions();
            return;
        }
        
        // Clear previous suggestions
        this.suggestionsEl.innerHTML = '';
        
        // If no query, show recent searches or popular searches
        if (!query) {
            this.hideSuggestions();
            return;
        }
        
        const lowerQuery = query.toLowerCase();
        const suggestions = new Set();
        const maxSuggestions = 10;
        
        // Search through data for matching values
        this.tableManager.baseFilteredData.forEach(item => {
            if (suggestions.size >= maxSuggestions) return;
            
            Object.values(item).forEach(value => {
                if (suggestions.size >= maxSuggestions) return;
                
                const strValue = String(value || '').toLowerCase();
                if (strValue.includes(lowerQuery) && strValue !== lowerQuery) {
                    suggestions.add(value);
                }
            });
        });
        
        // If no suggestions found
        if (suggestions.size === 0) {
            this.hideSuggestions();
            return;
        }
        
        // Create suggestion items
        suggestions.forEach(suggestion => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.textContent = suggestion;
            
            div.addEventListener('click', () => {
                this.searchInput.value = suggestion;
                this.tableManager.filterData(suggestion);
                this.hideSuggestions();
                
                // Show details of the first matching item
                const matchingItems = this.tableManager.filteredData;
                if (matchingItems.length > 0) {
                    this.tableManager.showRowDetails(matchingItems[0]);
                }
            });
            
            this.suggestionsEl.appendChild(div);
        });
        
        this.suggestionsEl.style.display = 'block';
    }
    
    // Hide suggestions
    hideSuggestions() {
        this.suggestionsEl.style.display = 'none';
    }
    
    // Clear search
    clearSearch() {
        this.searchInput.value = '';
        this.tableManager.searchQuery = '';
        this.tableManager.filterData('');
        this.hideSuggestions();
    }
}

// Make SearchManager available globally
window.SearchManager = SearchManager;
