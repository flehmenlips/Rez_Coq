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
        const response = await fetch('/api/reservations');
        const reservations = await response.json();
        
        const tbody = document.getElementById('reservationsList');
        tbody.innerHTML = ''; // Clear existing rows
        
        reservations.forEach(reservation => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${reservation.date}</td>
                <td>${reservation.time}</td>
                <td>${reservation.name}</td>
                <td>${reservation.guests}</td>
                <td>${reservation.email}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading reservations:', error);
    }
}

// Refresh reservations every 30 seconds
setInterval(loadReservations, 30000); 