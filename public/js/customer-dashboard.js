// Global state
let currentFilter = 'upcoming';
let userReservations = [];

// Load user info and reservations on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadUserInfo();
    await loadReservations();
    setupEventListeners();
});

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
        showError('Failed to load user information');
    }
}

// Load reservations
async function loadReservations() {
    try {
        const response = await fetch('/api/reservations/user');
        const data = await response.json();
        
        if (data.success) {
            userReservations = data.reservations;
            updateReservationsDisplay();
            updateUpcomingCount();
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Error loading reservations:', error);
        showError('Failed to load reservations');
    }
}

// Update reservations display based on current filter
function updateReservationsDisplay() {
    const tbody = document.getElementById('reservationsList');
    const noReservations = document.getElementById('noReservations');
    tbody.innerHTML = '';
    
    const now = new Date();
    let filteredReservations = userReservations;
    
    // Apply filter
    if (currentFilter === 'upcoming') {
        filteredReservations = userReservations.filter(r => new Date(`${r.date} ${r.time}`) >= now);
    } else if (currentFilter === 'past') {
        filteredReservations = userReservations.filter(r => new Date(`${r.date} ${r.time}`) < now);
    }
    
    // Sort by date and time
    filteredReservations.sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.time}`);
        const dateB = new Date(`${b.date} ${b.time}`);
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
            const reservationDate = new Date(`${reservation.date} ${reservation.time}`);
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
    return new Date(dateStr).toLocaleDateString();
}

function formatTime(timeStr) {
    return new Date(`2000-01-01 ${timeStr}`).toLocaleTimeString([], { 
        hour: 'numeric', 
        minute: '2-digit' 
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