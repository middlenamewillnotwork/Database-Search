/**
 * Keyboard Shortcuts for Database Search Application
 * 
 * Handles keyboard shortcuts for common actions:
 * - Ctrl/Cmd + Shift + S: Focus search input
 * - Ctrl/Cmd + Shift + F: Toggle filter panel
 */

document.addEventListener('DOMContentLoaded', function() {
    // Wait for the DOM to be fully loaded
    const searchInput = document.getElementById('searchInput');
    const filterBtn = document.getElementById('filterBtn');
    const filterDropdown = document.getElementById('filterDropdown');
    
    // Check if required elements exist
    if (!searchInput || !filterBtn || !filterDropdown) {
        console.warn('Required elements for shortcuts not found. Shortcuts may not work as expected.');
        return;
    }
    
    // Handle keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Check for Ctrl+Shift+S or Cmd+Shift+S (focus search)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            searchInput.focus();
        }
        
        // Check for Ctrl+Shift+F or Cmd+Shift+F (toggle filter)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
            e.preventDefault();
            filterBtn.click();
        }
    });
    
    console.log('Keyboard shortcuts initialized');
});
