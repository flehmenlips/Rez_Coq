// Load settings
async function loadSettings() {
    try {
        const response = await fetch('/api/settings');
        const settings = await response.json();
        
        console.log('Loaded settings:', settings);
        
        // Populate form fields with settings values
        const inputs = document.querySelectorAll('#settingsForm input');
        inputs.forEach(input => {
            const settingValue = settings[input.id];
            if (settingValue !== undefined) {
                input.value = settingValue;
            }
        });
    } catch (error) {
        console.error('Error loading settings:', error);
        alert('Error loading settings: ' + error.message);
    }
}

// Load reservations
async function loadReservations() {
    try {
        const response = await fetch('/api/reservations');
        if (!response.ok) throw new Error('Failed to load reservations');
        const reservations = await response.json();
        
        const tbody = document.getElementById('reservationsTable');
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
        document.getElementById('reservationsTable').innerHTML = `
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
        const settings = {
            opening_time: formData.get('opening_time'),
            closing_time: formData.get('closing_time'),
            slot_duration: formData.get('slot_duration'),
            reservation_window: formData.get('reservation_window'),
            window_update_time: formData.get('window_update_time')
        };
        
        console.log('Saving settings:', settings);
        
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(error);
        }
        
        const result = await response.json();
        if (result.success) {
            alert('Settings saved successfully!');
        } else {
            throw new Error(result.message || 'Failed to save settings');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Error saving settings: ' + error.message);
    }
});

// Load settings on page load
document.addEventListener('DOMContentLoaded', loadSettings);

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