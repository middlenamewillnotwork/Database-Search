// Storage utility functions
class StorageManager {
    constructor(storageKey = 'databaseSearch') {
        this.storageKey = storageKey;
    }

    // Save data to localStorage
    saveData(data) {
        try {
            // Check if data already has source info (from fetch)
            const dataToStore = {
                data: data.data || data, // Handle both new and old formats
                timestamp: new Date().getTime(),
                source: data.source || null // Include source info if available
            };
            localStorage.setItem(this.storageKey, JSON.stringify(dataToStore));
            return true;
        } catch (error) {
            console.error('Error saving data to localStorage:', error);
            return false;
        }
    }

    // Get data from localStorage
    getData() {
        try {
            const storedData = localStorage.getItem(this.storageKey);
            if (!storedData) return null;
            
            const parsed = JSON.parse(storedData);
            
            // For backward compatibility with old format
            if (!parsed.source && parsed.data) {
                return parsed.data;
            }
            
            return parsed;
        } catch (error) {
            console.error('Error retrieving data from localStorage:', error);
            return null;
        }
    }

    // Clear data from localStorage
    clearData() {
        try {
            localStorage.removeItem(this.storageKey);
            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    }

    // Check if data is older than specified hours
    isDataOlderThan(hours) {
        const storedData = this.getData();
        if (!storedData) return true;
        
        // Handle both old and new data formats
        const timestamp = storedData.timestamp || (storedData.data && storedData.data.timestamp);
        if (!timestamp) return true;
        
        const storedTime = new Date(timestamp).getTime();
        const currentTime = new Date().getTime();
        const hoursInMs = hours * 60 * 60 * 1000;
        
        return (currentTime - storedTime) > hoursInMs;
    }
}

// Create a global instance
window.storageManager = new StorageManager('databaseSearch');
