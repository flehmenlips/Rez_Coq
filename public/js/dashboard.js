// User session management
let currentUser = null;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Bootstrap tabs
    const triggerTabList = [].slice.call(document.querySelectorAll('#dashboardTabs button'));
    triggerTabList.forEach(function (triggerEl) {
        const tabTrigger = new bootstrap.Tab(triggerEl);
        triggerEl.addEventListener('click', function (event) {
            event.preventDefault();
            tabTrigger.show();
        });
    });

    // Load user info
    loadUserInfo();
    
    // Load initial data
    loadDashboardData();
    
    // Event listeners
    document.getElementById('settingsForm').addEventListener('submit', saveSettings);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('addUserBtn')?.addEventListener('click', showAddUserModal);
});

async function loadUserInfo() {
    try {
        const response = await fetch('/api/auth/user');
        if (response.ok) {
            currentUser = await response.json();
            updateUserDisplay(currentUser);
        }
    } catch (error) {
        console.error('Error loading user info:', error);
    }
}

function updateUserDisplay(user) {
    if (user) {
        document.getElementById('userName').textContent = user.name || 'Admin User';
        document.getElementById('userRole').textContent = user.role || 'Restaurant Staff';
        document.getElementById('userInitials').textContent = getInitials(user.name);
    }
}

function getInitials(name) {
    if (!name) return 'A';
    return name.split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

async function loadDashboardData() {
    await Promise.all([
        loadReservations(),
        loadSettings(),
        loadUsers()
    ]);
}

async function loadReservations() {
    try {
        const response = await fetch('/api/reservations');
        if (!response.ok) throw new Error('Failed to load reservations');
        
        const reservations = await response.json();
        updateDashboardStats(reservations);
        populateReservationsTable(reservations);
    } catch (error) {
        console.error('Error loading reservations:', error);
        showAlert('Error loading reservations. Please try again.', 'danger');
    }
}

function updateDashboardStats(reservations) {
    const today = new Date().toISOString().split('T')[0];
    const todayReservations = reservations.filter(r => r.date === today);
    
    document.getElementById('todayCount').textContent = todayReservations.length;
    document.getElementById('todayGuests').textContent = todayReservations.reduce((sum, r) => sum + r.guests, 0);
    document.getElementById('weeklyTotal').textContent = reservations.length;
    document.getElementById('pendingEmails').textContent = reservations.filter(r => !r.email_sent).length;
}

function populateReservationsTable(reservations) {
    const tbody = document.getElementById('reservationsTableBody');
    tbody.innerHTML = '';

    reservations.forEach(reservation => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDate(reservation.date)}</td>
            <td>${formatTime(reservation.time)}</td>
            <td>${escapeHtml(reservation.name)}</td>
            <td>${escapeHtml(reservation.email)}</td>
            <td>${reservation.guests}</td>
            <td><span class="badge bg-${getStatusBadgeClass(reservation.status)}">${reservation.status}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editReservation(${reservation.id})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteReservation(${reservation.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function editReservation(id) {
    try {
        const response = await fetch(`/api/reservations/${id}`);
        if (!response.ok) throw new Error('Failed to load reservation');
        
        const reservation = await response.json();
        showEditReservationModal(reservation);
    } catch (error) {
        console.error('Error loading reservation:', error);
        showAlert('Error loading reservation details. Please try again.', 'danger');
    }
}

async function deleteReservation(id) {
    if (!confirm('Are you sure you want to delete this reservation?')) return;

    try {
        const response = await fetch(`/api/reservations/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete reservation');
        
        await loadReservations(); // Reload the table
        showAlert('Reservation deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting reservation:', error);
        showAlert('Error deleting reservation. Please try again.', 'danger');
    }
}

async function loadSettings() {
    try {
        const response = await fetch('/api/settings');
        if (!response.ok) throw new Error('Failed to load settings');
        
        const settings = await response.json();
        populateSettingsForm(settings);
    } catch (error) {
        console.error('Error loading settings:', error);
        showAlert('Error loading settings. Please try again.', 'danger');
    }
}

function populateSettingsForm(settings) {
    document.getElementById('daily_max_guests').value = settings.daily_max_guests || '';
    document.getElementById('max_party_size').value = settings.max_party_size || '';
    document.getElementById('opening_time').value = settings.opening_time || '';
    document.getElementById('closing_time').value = settings.closing_time || '';
}

async function saveSettings(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const settings = Object.fromEntries(formData.entries());

    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });

        if (!response.ok) throw new Error('Failed to save settings');
        
        showAlert('Settings saved successfully', 'success');
    } catch (error) {
        console.error('Error saving settings:', error);
        showAlert('Error saving settings. Please try again.', 'danger');
    }
}

async function loadUsers() {
    if (!document.getElementById('userList')) return;
    
    try {
        const response = await fetch('/api/users');
        if (!response.ok) throw new Error('Failed to load users');
        
        const users = await response.json();
        populateUserList(users);
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function populateUserList(users) {
    const userList = document.getElementById('userList');
    userList.innerHTML = '';

    users.forEach(user => {
        const div = document.createElement('div');
        div.className = 'list-group-item d-flex justify-content-between align-items-center';
        div.innerHTML = `
            <div>
                <h6 class="mb-0">${escapeHtml(user.name)}</h6>
                <small class="text-muted">${user.role}</small>
            </div>
            <div>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editUser(${user.id})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteUser(${user.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        userList.appendChild(div);
    });
}

async function handleLogout() {
    try {
        const response = await fetch('/api/auth/logout', { method: 'POST' });
        if (response.ok) {
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('Error during logout:', error);
        showAlert('Error logging out. Please try again.', 'danger');
    }
}

// Utility functions
function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString();
}

function formatTime(timeStr) {
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getStatusBadgeClass(status) {
    const statusClasses = {
        'confirmed': 'success',
        'pending': 'warning',
        'cancelled': 'danger',
        'completed': 'info'
    };
    return statusClasses[status.toLowerCase()] || 'secondary';
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showAlert(message, type = 'info') {
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    alert.role = 'alert';
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Add to document
    document.body.appendChild(alert);
    
    // Remove after 5 seconds
    setTimeout(() => {
        alert.remove();
    }, 5000);
} 