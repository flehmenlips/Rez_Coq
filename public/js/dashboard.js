// Load settings
async function loadSettings() {
    try {
        const response = await fetch('/api/settings');
        if (!response.ok) throw new Error('Failed to load settings');
        const settings = await response.json();
        
        // Populate form fields
        settings.forEach(setting => {
            const input = document.getElementById(setting.key);
            if (input) input.value = setting.value;
        });
    } catch (error) {
        console.error('Error loading settings:', error);
        alert('Failed to load settings');
    }
}

// Save settings
document.getElementById('settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const formData = new FormData(e.target);
        const settings = {};
        
        // Convert form data to object
        for (let [key, value] of formData.entries()) {
            settings[key] = value;
        }
        
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });

        if (!response.ok) throw new Error('Failed to save settings');
        
        const result = await response.json();
        alert('Settings saved successfully');
        
        // Reload settings to confirm changes
        loadSettings();
        
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Failed to save settings');
    }
});

// Load settings on page load
document.addEventListener('DOMContentLoaded', loadSettings);

// Add logout handler (from previous code)
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin'
        });
        
        if (response.ok) {
            console.log('Logout successful');
            window.location.href = '/login';
        } else {
            console.error('Logout failed:', await response.text());
        }
    } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to logout. Please try again.');
    }
}); 