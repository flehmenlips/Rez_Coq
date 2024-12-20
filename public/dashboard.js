document.addEventListener('DOMContentLoaded', async () => {
    // Load current settings
    try {
        const response = await fetch('/api/settings');
        const settingsRows = await response.json();
        
        // Convert array of rows to settings object
        const settings = settingsRows.reduce((acc, row) => {
            acc[row.key] = row.value;
            return acc;
        }, {});
        
        // Update each form field with saved values
        Object.entries(settings).forEach(([key, value]) => {
            const input = document.getElementById(key);
            if (input) {
                if (input.type === 'time') {
                    // Ensure time values are properly formatted (HH:mm)
                    input.value = value.padStart(5, '0');
                } else if (input.type === 'number') {
                    input.value = parseInt(value);
                } else {
                    input.value = value;
                }
            }
        });
        
        // Load reservations after settings are loaded
        await loadReservations();
    } catch (error) {
        console.error('Error loading settings:', error);
        showErrorModal('Failed to load settings. Please refresh the page.');
    }

    await checkSession();
});

document.getElementById('settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner"></span> Saving...';

    try {
        // Collect all form values
        const settings = {
            opening_time: form.opening_time.value,
            closing_time: form.closing_time.value,
            max_party_size: form.max_party_size.value,
            daily_max_guests: form.daily_max_guests.value,
            slot_duration: form.slot_duration.value
        };

        // Validate settings
        if (new Date(`2000-01-01 ${settings.closing_time}`) <= 
            new Date(`2000-01-01 ${settings.opening_time}`)) {
            throw new Error('Closing time must be after opening time');
        }

        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });

        if (!response.ok) {
            throw new Error('Failed to save settings');
        }

        showSuccessMessage('Settings saved successfully');
    } catch (error) {
        console.error('Error saving settings:', error);
        showErrorMessage(error.message || 'Failed to save settings');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Save Settings';
    }
});

// Function to load reservations
async function loadReservations() {
    try {
        await updateReservationsList();
    } catch (error) {
        console.error('Error loading reservations:', error);
    }
}

// Refresh reservations every 30 seconds
setInterval(loadReservations, 30000); 

function updateReservationsList() {
    fetch('/api/reservations')
        .then(response => response.json())
        .then(reservations => {
            const tbody = document.getElementById('reservationsList');
            tbody.innerHTML = '';
            
            reservations.forEach(reservation => {
                const tr = document.createElement('tr');
                
                // Format date
                const date = new Date(reservation.date).toLocaleDateString();
                
                tr.innerHTML = `
                    <td>${date}</td>
                    <td>${reservation.time}</td>
                    <td>${reservation.name}</td>
                    <td>${reservation.guests}</td>
                    <td>${reservation.email}</td>
                    <td class="email-status ${reservation.email_status}">
                        ${reservation.email_status}
                        ${reservation.email_error ? 
                            `<span class="error-tooltip">${reservation.email_error}</span>` 
                            : ''}
                    </td>
                    <td>
                        ${reservation.email_status === 'failed' ? 
                            `<button onclick="retryEmail(${reservation.id})">
                                Retry Email
                            </button>` 
                            : ''}
                    </td>
                `;
                
                tbody.appendChild(tr);
            });
        });
}

// Add retry functionality
async function retryEmail(reservationId) {
    try {
        const response = await fetch(`/api/reservations/${reservationId}/retry-email`, {
            method: 'POST'
        });
        const result = await response.json();
        
        if (result.success) {
            alert('Email sent successfully');
            updateReservationsList();
        } else {
            alert('Failed to send email: ' + result.message);
        }
    } catch (error) {
        alert('Error retrying email: ' + error.message);
    }
} 

function showSuccessMessage(message) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-success';
    alert.role = 'alert';
    alert.textContent = message;
    
    insertAlert(alert);
}

function showErrorMessage(message) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger';
    alert.role = 'alert';
    alert.textContent = message;
    
    insertAlert(alert);
}

function insertAlert(alert) {
    const container = document.querySelector('.dashboard-container');
    const form = document.getElementById('settingsForm');
    container.insertBefore(alert, form);
    
    // Remove after 3 seconds
    setTimeout(() => alert.remove(), 3000);
} 

// Add logout handler
document.getElementById('logoutButton').addEventListener('click', async () => {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        if (result.success) {
            window.location.href = '/login';
        } else {
            showErrorMessage('Logout failed');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showErrorMessage('Error during logout');
    }
});

// Add session check on page load
async function checkSession() {
    try {
        const response = await fetch('/api/auth/check-session');
        const result = await response.json();
        
        if (!result.authenticated) {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Session check error:', error);
        window.location.href = '/login';
    }
} 