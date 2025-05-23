// Storage utility functions
class StorageManager {
    constructor(storageKey = 'databaseSearch') {
        this.storageKey = storageKey;
    }

    // Save data to localStorage
    saveData(data) {
        try {
            const dataToStore = {
                data: data,
                timestamp: new Date().getTime()
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
            
            return JSON.parse(storedData);
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
        if (!storedData || !storedData.timestamp) return true;
        
        const storedTime = new Date(storedData.timestamp).getTime();
        const currentTime = new Date().getTime();
        const hoursInMs = hours * 60 * 60 * 1000;
        
        return (currentTime - storedTime) > hoursInMs;
    }
}

// Create a global instance
window.storageManager = new StorageManager('databaseSearch');
