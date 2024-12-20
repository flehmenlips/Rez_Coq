document.addEventListener('DOMContentLoaded', async () => {
    // Load current settings
    try {
        const response = await fetch('/api/settings');
        const settings = await response.json();
        
        Object.entries(settings).forEach(([key, value]) => {
            const input = document.getElementById(key);
            if (input) input.value = value;
        });
    } catch (error) {
        console.error('Error loading settings:', error);
    }

    // Load reservations
    loadReservations();
});

document.getElementById('settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const settings = Object.fromEntries(formData.entries());

    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(settings)
        });
        
        if (!response.ok) throw new Error('Failed to save settings');
        alert('Settings saved successfully!');
    } catch (error) {
        alert('Error saving settings: ' + error.message);
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