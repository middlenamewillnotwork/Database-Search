/**
 * Export functionality for the database search application
 * Handles exporting filtered data to various formats (CSV, Excel, JSON)
 */

class ExportManager {
    constructor(tableManager) {
        this.exportBtn = document.getElementById('exportBtn');
        this.exportOptions = document.getElementById('exportOptions');
        this.tableManager = tableManager;
        
        if (this.exportBtn && this.exportOptions) {
            this.initialize();
        }
    }
    
    initialize() {
        // Toggle export options
        this.exportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.exportOptions.classList.toggle('show');
            
            // Add ESC key listener when dropdown is shown
            if (this.exportOptions.classList.contains('show')) {
                document.addEventListener('keydown', this.handleEscape.bind(this));
            } else {
                document.removeEventListener('keydown', this.handleEscape.bind(this));
            }
        });
        
        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.exportBtn.contains(e.target) && !this.exportOptions.contains(e.target)) {
                this.exportOptions.classList.remove('show');
            }
        });
        
        // Handle export option clicks
        const options = this.exportOptions.querySelectorAll('.export-option');
        options.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const format = option.dataset.format;
                this.exportData(format);
                this.exportOptions.classList.remove('show');
            });
        });
        
        // Store bound function for cleanup
        this.handleEscape = this.handleEscape.bind(this);
    }
    
    /**
     * Handle ESC key to close dropdown
     */
    handleEscape(e) {
        if (e.key === 'Escape') {
            this.exportOptions.classList.remove('show');
            document.removeEventListener('keydown', this.handleEscape);
        }
    }
    
    /**
     * Add event listener for ESC key
     */
    addEscapeListener() {
        this.handleEscape = (e) => {
            if (e.key === 'Escape') {
                this.closeExportOptions();
            }
        };
        document.addEventListener('keydown', this.handleEscape);
    }
    
    /**
     * Remove ESC key event listener
     */
    removeEscapeListener() {
        if (this.handleEscape) {
            document.removeEventListener('keydown', this.handleEscape);
            this.handleEscape = null;
        }
    }
    
    /**
     * Close the export options dropdown and clean up event listeners
     */
    closeExportOptions() {
        this.exportOptions.classList.remove('show');
        this.removeEscapeListener();
        
        // Remove the click outside handler if it exists
        if (this.handleClickOutside) {
            document.removeEventListener('click', this.handleClickOutside);
        }
    }
    
    /**
     * Export the currently filtered data to the specified format
     * @param {string} format - The export format ('csv', 'excel', 'json')
     */
    exportData(format) {
        const data = this.tableManager.filteredData || [];
        if (data.length === 0) {
            alert('No data to export');
            return;
        }
        
        switch (format) {
            case 'csv':
                this.exportToCSV(data);
                break;
            case 'excel':
                this.exportToExcel(data);
                break;
            case 'json':
                this.exportToJSON(data);
                break;
            default:
                console.error('Unsupported export format:', format);
        }
    }
    
    /**
     * Export data to CSV format
     * @param {Array} data - The data to export
     */
    exportToCSV(data) {
        if (!data || data.length === 0) return;
        
        // Get headers from the first object's keys
        const headers = Object.keys(data[0]);
        
        // Create CSV content
        let csvContent = headers.join(',') + '\n';
        
        // Add data rows
        data.forEach(item => {
            const row = headers.map(header => {
                // Escape quotes and wrap in quotes to handle commas
                const value = String(item[header] || '').replace(/"/g, '""');
                return `"${value}"`;
            });
            csvContent += row.join(',') + '\n';
        });
        
        // Create download link
        this.downloadFile(csvContent, 'csv', 'text/csv');
    }
    
    /**
     * Export data to Excel format (CSV with .xls extension for simplicity)
     * For more advanced Excel features, consider using a library like SheetJS
     * @param {Array} data - The data to export
     */
    exportToExcel(data) {
        if (!data || data.length === 0) return;
        
        // Get headers from the first object's keys
        const headers = Object.keys(data[0]);
        
        // Create Excel XML content (simplified)
        let excelContent = '<?xml version="1.0"?>\n' +
            '<ss:Workbook xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n' +
            '<ss:Worksheet ss:Name="Sheet1">\n' +
            '<ss:Table>\n';
        
        // Add headers
        excelContent += '<ss:Row>\n';
        headers.forEach(header => {
            excelContent += `<ss:Cell><ss:Data ss:Type="String">${this.escapeXml(header)}</ss:Data></ss:Cell>\n`;
        });
        excelContent += '</ss:Row>\n';
        
        // Add data rows
        data.forEach(item => {
            excelContent += '<ss:Row>\n';
            headers.forEach(header => {
                const value = String(item[header] || '');
                excelContent += `<ss:Cell><ss:Data ss:Type="String">${this.escapeXml(value)}</ss:Data></ss:Cell>\n`;
            });
            excelContent += '</ss:Row>\n';
        });
        
        excelContent += '</ss:Table>\n</ss:Worksheet>\n</ss:Workbook>';
        
        // Create download link
        this.downloadFile(excelContent, 'xls', 'application/vnd.ms-excel');
    }
    
    /**
     * Export data to JSON format
     * @param {Array} data - The data to export
     */
    exportToJSON(data) {
        if (!data || data.length === 0) return;
        
        const jsonContent = JSON.stringify(data, null, 2);
        this.downloadFile(jsonContent, 'json', 'application/json');
    }
    
    /**
     * Helper function to create and trigger a file download
     * @param {string} content - The file content
     * @param {string} extension - The file extension
     * @param {string} type - The MIME type
     */
    downloadFile(content, extension, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        a.href = url;
        a.download = `export-${timestamp}.${extension}`;
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }
    
    /**
     * Helper function to escape XML special characters
     * @param {string} text - The text to escape
     * @returns {string} The escaped text
     */
    escapeXml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
}

// Make ExportManager available globally
window.ExportManager = ExportManager;
