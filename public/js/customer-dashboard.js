// Handle logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Logout failed:', error);
    }
});

// Load user's reservations
async function loadReservations() {
    try {
        const response = await fetch('/api/reservations/my-reservations');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const reservations = await response.json();
        console.log('Loaded reservations:', reservations);
        
        const tbody = document.getElementById('reservationsList');
        tbody.innerHTML = '';
        
        if (reservations.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">
                        No reservations found
                    </td>
                </tr>
            `;
            return;
        }
        
        reservations.forEach(reservation => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(reservation.date).toLocaleDateString()}</td>
                <td>${reservation.time}</td>
                <td>${reservation.guests}</td>
                <td>${reservation.email_status}</td>
                <td>
                    <button class="btn btn-sm btn-danger" 
                            onclick="cancelReservation(${reservation.id})">
                        Cancel
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading reservations:', error);
        document.getElementById('reservationsList').innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger">
                    Error loading reservations: ${error.message}
                </td>
            </tr>
        `;
    }
}

// Cancel reservation
async function cancelReservation(id) {
    if (!confirm('Are you sure you want to cancel this reservation?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/reservations/${id}/cancel`, {
            method: 'POST'
        });
        
        if (response.ok) {
            loadReservations();
        } else {
            const error = await response.json();
            alert(error.message || 'Failed to cancel reservation');
        }
    } catch (error) {
        console.error('Error canceling reservation:', error);
        alert('Failed to cancel reservation');
    }
}

// Load reservations on page load
document.addEventListener('DOMContentLoaded', loadReservations); 