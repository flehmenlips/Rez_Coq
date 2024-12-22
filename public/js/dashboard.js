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

// Load reservations
async function loadReservations() {
    try {
        const response = await fetch('/api/reservations');
        if (!response.ok) throw new Error('Failed to load reservations');
        const reservations = await response.json();
        
        const tbody = document.getElementById('reservationsList');
        tbody.innerHTML = '';
        
        if (reservations.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">No reservations found</td>
                </tr>
            `;
            return;
        }
        
        reservations.forEach(reservation => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(reservation.date).toLocaleDateString()}</td>
                <td>${reservation.time}</td>
                <td>${reservation.name}</td>
                <td>${reservation.email}</td>
                <td>${reservation.guests}</td>
                <td>${reservation.email_status}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading reservations:', error);
        document.getElementById('reservationsList').innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger">
                    Error loading reservations: ${error.message}
                </td>
            </tr>
        `;
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

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadReservations();
});

// Add logout handler
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

// Add to existing dashboard.js
document.getElementById('viewDbBtn').addEventListener('click', async () => {
    try {
        const response = await fetch('/api/admin/db-view');
        const data = await response.json();
        
        document.getElementById('dbContent').textContent = 
            JSON.stringify(data, null, 2);
        
        new bootstrap.Modal(document.getElementById('dbViewer')).show();
    } catch (error) {
        console.error('Error viewing database:', error);
        alert('Failed to load database contents');
    }
}); 