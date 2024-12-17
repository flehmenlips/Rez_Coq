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