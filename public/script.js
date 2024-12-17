// Add this at the start of your script
async function updateDateInput() {
    try {
        // Fetch rolling days setting
        const response = await fetch('/api/settings');
        const settings = await response.json();
        const rollingDays = parseInt(settings.rolling_days);

        // Set min and max dates
        const dateInput = document.getElementById('date');
        const today = new Date();
        const maxDate = new Date();
        maxDate.setDate(today.getDate() + rollingDays);

        dateInput.min = today.toISOString().split('T')[0];
        dateInput.max = maxDate.toISOString().split('T')[0];
    } catch (error) {
        console.error('Error updating date restrictions:', error);
    }
}

// Add this to your existing DOMContentLoaded event
document.addEventListener('DOMContentLoaded', () => {
    updateDateInput();
});

document.getElementById('reservationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const reservation = Object.fromEntries(formData.entries());

    try {
        const response = await fetch('/api/reservation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(reservation)
        });
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const result = await response.text();
        alert(result);
    } catch (error) {
        alert('Error making reservation: ' + error.message);
    }
});