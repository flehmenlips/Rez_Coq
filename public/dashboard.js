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
    
    try {
        // Get selected operating days
        const selectedDays = Array.from(
            document.querySelectorAll('input[name="operating_days"]:checked')
        ).map(checkbox => checkbox.value);
        
        // Gather all form data
        const settings = {
            operating_days: selectedDays,
            opening_time: document.querySelector('input[name="opening_time"]').value,
            closing_time: document.querySelector('input[name="closing_time"]').value,
            slot_duration: parseInt(document.querySelector('input[name="slot_duration"]').value),
            daily_max_guests: parseInt(document.querySelector('input[name="daily_max_guests"]').value),
            rolling_days: parseInt(document.querySelector('input[name="rolling_days"]').value),
            min_party_size: parseInt(document.querySelector('input[name="min_party_size"]').value),
            max_party_size: parseInt(document.querySelector('input[name="max_party_size"]').value)
        };
        
        console.log('Sending settings update:', settings);
        
        // Use PUT instead of POST
        const response = await fetch('/api/settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save settings');
        }
        
        const savedSettings = await response.json();
        console.log('Settings saved successfully:', savedSettings);
        
        // Show success message
        alert('Settings saved successfully!');
        
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Failed to save settings: ' + error.message);
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
            const date = new Date(reservation.date).toLocaleDateString();
            
            row.innerHTML = `
                <td>${date}</td>
                <td>${reservation.time}</td>
                <td>${reservation.name}</td>
                <td>${reservation.partySize}</td>
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

// Load and display settings
async function loadSettings() {
    try {
        console.log('Fetching settings...'); // Debug log
        const response = await fetch('/api/settings');
        
        if (!response.ok) {
            throw new Error('Failed to fetch settings');
        }
        
        const settings = await response.json();
        console.log('Received settings:', settings); // Debug log
        
        // Set operating days
        const dayCheckboxes = document.querySelectorAll('input[name="operating_days"]');
        dayCheckboxes.forEach(checkbox => {
            checkbox.checked = settings.operating_days.includes(checkbox.value);
        });
        
        // Set other form values
        document.querySelector('input[name="opening_time"]').value = settings.opening_time;
        document.querySelector('input[name="closing_time"]').value = settings.closing_time;
        document.querySelector('input[name="slot_duration"]').value = settings.slot_duration;
        document.querySelector('input[name="daily_max_guests"]').value = settings.daily_max_guests;
        document.querySelector('input[name="rolling_days"]').value = settings.rolling_days;
        document.querySelector('input[name="min_party_size"]').value = settings.min_party_size;
        document.querySelector('input[name="max_party_size"]').value = settings.max_party_size;
        
    } catch (error) {
        console.error('Error loading settings:', error);
        alert('Failed to load settings: ' + error.message);
    }
}

// Load settings when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    
    // Debug: Log when form is found
    const form = document.getElementById('settingsForm');
    if (form) {
        console.log('Settings form found');
    } else {
        console.error('Settings form not found');
    }
});