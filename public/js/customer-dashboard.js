// Global state
let currentFilter = 'upcoming';
let userReservations = [];
let currentReservation = null;

// Bootstrap components
let cancelModal = null;
let modifyModal = null;

// Load user info and reservations on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadUserInfo();
    await loadReservations();
    setupEventListeners();
    initializeComponents();
});

// Initialize Bootstrap components
function initializeComponents() {
    // Initialize modals
    cancelModal = new bootstrap.Modal(document.getElementById('cancelModal'));
    modifyModal = new bootstrap.Modal(document.getElementById('modifyModal'));
    
    // Initialize event listeners for modals
    document.getElementById('confirmCancelBtn').addEventListener('click', handleCancelConfirm);
    document.getElementById('confirmModifyBtn').addEventListener('click', handleModifyConfirm);
}

// Load user information
async function loadUserInfo() {
    try {
        const response = await fetch('/api/auth/account');
        const data = await response.json();
        
        if (data.success) {
            const user = data.user;
            document.getElementById('welcomeMessage').textContent = `Welcome back, ${user.username}!`;
            document.getElementById('userEmail').textContent = user.email;
            
            // Format member since date
            const memberSince = new Date(user.created_at);
            document.getElementById('memberSince').textContent = 
                `Member since ${memberSince.toLocaleDateString()}`;
        }
    } catch (error) {
        console.error('Error loading user info:', error);
        showToast('Failed to load user information', 'error');
    }
}

// Load reservations
async function loadReservations() {
    try {
        const response = await fetch('/api/reservations/my-reservations');
        const data = await response.json();
        
        if (Array.isArray(data)) {
            userReservations = data;
            updateReservationsDisplay();
            updateUpcomingCount();
        } else {
            console.error('Unexpected data format:', data);
            showToast('Failed to load reservations', 'error');
        }
    } catch (error) {
        console.error('Error loading reservations:', error);
        showToast('Failed to load reservations', 'error');
    }
}

// Update reservations display based on current filter
function updateReservationsDisplay() {
    const tbody = document.getElementById('reservationsList');
    const noReservations = document.getElementById('noReservations');
    tbody.innerHTML = '';
    
    const now = new Date();
    let filteredReservations = [...userReservations]; // Create a copy of the array
    
    // Apply filter
    if (currentFilter === 'upcoming') {
        filteredReservations = filteredReservations.filter(r => {
            const reservationDate = new Date(`${r.date.split('T')[0]} ${r.time}`);
            return reservationDate >= now;
        });
    } else if (currentFilter === 'past') {
        filteredReservations = filteredReservations.filter(r => {
            const reservationDate = new Date(`${r.date.split('T')[0]} ${r.time}`);
            return reservationDate < now;
        });
    }
    
    // Sort by date and time
    filteredReservations.sort((a, b) => {
        const dateA = new Date(`${a.date.split('T')[0]} ${a.time}`);
        const dateB = new Date(`${b.date.split('T')[0]} ${b.time}`);
        return dateA - dateB;
    });
    
    if (filteredReservations.length === 0) {
        tbody.style.display = 'none';
        noReservations.style.display = 'block';
    } else {
        tbody.style.display = '';
        noReservations.style.display = 'none';
        
        filteredReservations.forEach(reservation => {
            const row = document.createElement('tr');
            const reservationDate = new Date(`${reservation.date.split('T')[0]} ${reservation.time}`);
            const isPast = reservationDate < now;
            
            row.innerHTML = `
                <td>${formatDate(reservation.date)}</td>
                <td>${formatTime(reservation.time)}</td>
                <td>${reservation.guests}</td>
                <td>
                    <span class="badge bg-${getStatusBadgeClass(reservation, isPast)}">
                        ${getStatusText(reservation, isPast)}
                    </span>
                </td>
                <td>
                    ${getActionButtons(reservation, isPast)}
                </td>
            `;
            tbody.appendChild(row);
        });
    }
}

// Update the upcoming reservations count
function updateUpcomingCount() {
    const now = new Date();
    const upcoming = userReservations.filter(r => new Date(`${r.date} ${r.time}`) >= now);
    const count = upcoming.length;
    document.getElementById('upcomingCount').textContent = 
        count === 0 ? 'No upcoming reservations' :
        count === 1 ? '1 upcoming reservation' :
        `${count} upcoming reservations`;
}

// Filter reservations
function filterReservations(filter) {
    currentFilter = filter;
    updateReservationsDisplay();
    
    // Update active button state
    document.querySelectorAll('.btn-group .btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase() === filter) {
            btn.classList.add('active');
        }
    });
}

// Scroll to reservations section
function scrollToReservations() {
    document.getElementById('reservationsSection').scrollIntoView({ behavior: 'smooth' });
}

// Setup event listeners
function setupEventListeners() {
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            const response = await fetch('/api/auth/logout', { method: 'POST' });
            const data = await response.json();
            
            if (data.success) {
                window.location.href = '/login';
            }
        } catch (error) {
            console.error('Logout error:', error);
            showError('Failed to logout');
        }
    });
}

// Helper functions
function formatDate(dateStr) {
    // Handle both ISO date strings and regular date strings
    const date = new Date(dateStr.split('T')[0]);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatTime(timeStr) {
    // Ensure proper time string format
    const [hours, minutes] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes), 0);
    return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true
    });
}

function getStatusBadgeClass(reservation, isPast) {
    if (isPast) return 'secondary';
    if (reservation.email_status === 'sent') return 'success';
    return 'primary';
}

function getStatusText(reservation, isPast) {
    if (isPast) return 'Completed';
    if (reservation.email_status === 'sent') return 'Confirmed';
    return 'Pending';
}

function getActionButtons(reservation, isPast) {
    if (isPast) {
        return `<button class="btn btn-sm btn-outline-primary" onclick="bookAgain(${reservation.id})">Book Again</button>`;
    }
    return `
        <button class="btn btn-sm btn-outline-danger me-1" onclick="cancelReservation(${reservation.id})">Cancel</button>
        <button class="btn btn-sm btn-outline-secondary" onclick="modifyReservation(${reservation.id})">Modify</button>
    `;
}

function showError(message) {
    // TODO: Implement error toast or alert
    console.error(message);
}

// Reservation Actions
async function cancelReservation(id) {
    const reservation = userReservations.find(r => r.id === id);
    if (!reservation) return;
    
    currentReservation = reservation;
    document.getElementById('cancelDetails').textContent = 
        `Date: ${formatDate(reservation.date)} at ${formatTime(reservation.time)} for ${reservation.guests} guests`;
    cancelModal.show();
}

async function handleCancelConfirm() {
    if (!currentReservation) return;
    
    const btn = document.getElementById('confirmCancelBtn');
    btn.classList.add('btn-loading');
    btn.disabled = true;
    
    try {
        const response = await fetch(`/api/reservations/${currentReservation.id}/cancel`, {
            method: 'POST'
        });
        
        const data = await response.json();
        if (data.success) {
            showToast('Reservation cancelled successfully', 'success');
            await loadReservations();
            cancelModal.hide();
        } else {
            showToast(data.message || 'Failed to cancel reservation', 'error');
        }
    } catch (error) {
        console.error('Error canceling reservation:', error);
        showToast('Failed to cancel reservation', 'error');
    } finally {
        btn.classList.remove('btn-loading');
        btn.disabled = false;
    }
}

async function modifyReservation(id) {
    const reservation = userReservations.find(r => r.id === id);
    if (!reservation) return;
    
    currentReservation = reservation;
    document.getElementById('modifyDate').value = reservation.date;
    document.getElementById('modifyTime').value = reservation.time;
    document.getElementById('modifyGuests').value = reservation.guests;
    modifyModal.show();
}

async function handleModifyConfirm() {
    if (!currentReservation) return;
    
    const btn = document.getElementById('confirmModifyBtn');
    btn.classList.add('btn-loading');
    btn.disabled = true;
    
    const formData = {
        date: document.getElementById('modifyDate').value,
        time: document.getElementById('modifyTime').value,
        guests: parseInt(document.getElementById('modifyGuests').value),
        name: currentReservation.name,
        email: currentReservation.email
    };
    
    try {
        const response = await fetch(`/api/reservations/${currentReservation.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to modify reservation');
        }
        
        const data = await response.json();
        if (data.success) {
            showToast('Reservation modified successfully', 'success');
            await loadReservations();
            modifyModal.hide();
        } else {
            throw new Error(data.message || 'Failed to modify reservation');
        }
    } catch (error) {
        console.error('Error modifying reservation:', error);
        showToast(error.message || 'Failed to modify reservation', 'error');
    } finally {
        btn.classList.remove('btn-loading');
        btn.disabled = false;
    }
}

async function bookAgain(id) {
    const reservation = userReservations.find(r => r.id === id);
    if (!reservation) return;
    
    // Redirect to booking page with pre-filled values
    const params = new URLSearchParams({
        guests: reservation.guests,
        date: reservation.date,
        time: reservation.time
    });
    window.location.href = `/?${params.toString()}`;
}

// Toast notifications
function showToast(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container');
    const toast = document.createElement('div');
    toast.className = `toast align-items-center border-0 bg-${type === 'error' ? 'danger' : type}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body text-white">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    toastContainer.appendChild(toast);
    
    const bsToast = new bootstrap.Toast(toast, { delay: 3000 });
    bsToast.show();
    
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
} 