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
    
    // Only add event listener if button exists
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', () => {
            // Placeholder for now
            showAlert('User management coming soon!', 'info');
        });
    }
});

async function loadUserInfo() {
    try {
        const response = await fetch('/api/auth/user');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        currentUser = await response.json();
        updateUserDisplay(currentUser);
    } catch (error) {
        console.error('Error loading user info:', error);
        showAlert('Error loading user information', 'warning');
    }
}

function updateUserDisplay(user) {
    if (user) {
        document.getElementById('userName').textContent = user.name || 'Admin User';
        document.getElementById('userRole').textContent = user.role || 'Restaurant Staff';
        document.getElementById('userInitials').textContent = getInitials(user.name || 'Admin User');
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
    try {
        await Promise.all([
            loadReservations(),
            loadSettings(),
            loadUsers()
        ]);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

async function loadReservations() {
    try {
        const response = await fetch('/api/reservations');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const reservations = await response.json();
        if (!Array.isArray(reservations)) {
            throw new Error('Invalid reservations data received');
        }
        
        updateDashboardStats(reservations);
        populateReservationsTable(reservations);
    } catch (error) {
        console.error('Error loading reservations:', error);
        showAlert('Error loading reservations. Please try again.', 'danger');
        // Show empty state in table
        populateReservationsTable([]);
    }
}

function updateDashboardStats(reservations) {
    const today = new Date().toISOString().split('T')[0];
    const todayReservations = reservations.filter(r => r.date === today);
    
    document.getElementById('todayCount').textContent = todayReservations.length;
    document.getElementById('todayGuests').textContent = todayReservations.reduce((sum, r) => sum + (parseInt(r.guests) || 0), 0);
    document.getElementById('weeklyTotal').textContent = reservations.length;
    document.getElementById('pendingEmails').textContent = reservations.filter(r => r.status === 'pending').length;
}

function populateReservationsTable(reservations) {
    const tbody = document.getElementById('reservationsTableBody');
    tbody.innerHTML = '';

    if (!reservations.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4">
                    <i class="bi bi-calendar-x mb-2" style="font-size: 2rem;"></i>
                    <p class="mb-0">No reservations found</p>
                </td>
            </tr>
        `;
        return;
    }

    reservations.forEach(reservation => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDate(reservation.date)}</td>
            <td>${formatTime(reservation.time)}</td>
            <td>${escapeHtml(reservation.name || '')}</td>
            <td>${escapeHtml(reservation.email || '')}</td>
            <td>${reservation.guests || 0}</td>
            <td><span class="badge bg-${getStatusBadgeClass(reservation.status || 'pending')}">${reservation.status || 'pending'}</span></td>
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
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const reservation = await response.json();
        // Placeholder for now
        showAlert('Edit functionality coming soon!', 'info');
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
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
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
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const settings = await response.json();
        
        // Update to use correct element IDs matching the HTML
        document.getElementById('opening_time').value = settings.opening_time || '';
        document.getElementById('closing_time').value = settings.closing_time || '';
        document.getElementById('max_party_size').value = settings.max_party_size || '';
        document.getElementById('daily_max_guests').value = settings.daily_max_guests || '';
        document.getElementById('availabilityWindow').value = settings.availability_window || '60';
        document.getElementById('windowUpdateTime').value = settings.window_update_time || '00:00';
        
        console.log('Settings loaded successfully');
    } catch (error) {
        console.error('Error loading settings:', error);
        showAlert('Failed to load settings. Please try again.', 'danger');
    }
}

function populateSettingsForm(settings) {
    const fields = ['daily_max_guests', 'max_party_size', 'opening_time', 'closing_time'];
    fields.forEach(field => {
        const element = document.getElementById(field);
        if (element && settings[field] !== undefined) {
            element.value = settings[field];
        }
    });
}

async function saveSettings(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    
    try {
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
        
        const formData = new FormData(form);
        const settings = Object.fromEntries(formData.entries());
        
        // Validate availability window
        const availabilityWindow = parseInt(settings.availability_window);
        if (isNaN(availabilityWindow) || availabilityWindow < 1 || availabilityWindow > 365) {
            throw new Error('Availability window must be between 1 and 365 days');
        }
        
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(settings)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to save settings');
        }
        
        showAlert('Settings saved successfully', 'success');
    } catch (error) {
        console.error('Error saving settings:', error);
        showAlert(error.message || 'Failed to save settings. Please try again.', 'danger');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
}

async function loadUsers() {
    const userList = document.getElementById('userList');
    if (!userList) return;
    
    try {
        const response = await fetch('/api/users');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const users = await response.json();
        if (!Array.isArray(users)) {
            throw new Error('Invalid users data received');
        }
        
        populateUserList(users);
    } catch (error) {
        console.error('Error loading users:', error);
        userList.innerHTML = `
            <div class="alert alert-warning">
                Error loading users. Please try again later.
            </div>
        `;
    }
}

function populateUserList(users) {
    const userList = document.getElementById('userList');
    userList.innerHTML = '';

    if (!users.length) {
        userList.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="bi bi-people mb-2" style="font-size: 2rem;"></i>
                <p class="mb-0">No users found</p>
            </div>
        `;
        return;
    }

    users.forEach(user => {
        const div = document.createElement('div');
        div.className = 'list-group-item d-flex justify-content-between align-items-center';
        div.innerHTML = `
            <div>
                <h6 class="mb-0">${escapeHtml(user.name || '')}</h6>
                <small class="text-muted">${user.role || 'User'}</small>
            </div>
            <div>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="showAlert('Edit user functionality coming soon!', 'info')">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="showAlert('Delete user functionality coming soon!', 'info')">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        userList.appendChild(div);
    });
}

async function handleLogout() {
    try {
        const response = await fetch('/api/auth/logout', { 
            method: 'POST',
            credentials: 'same-origin'
        });
        if (response.ok) {
            window.location.href = '/login.html';
        } else {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error('Error during logout:', error);
        showAlert('Error logging out. Please try again.', 'danger');
    }
}

// Utility functions
function formatDate(dateStr) {
    try {
        return new Date(dateStr).toLocaleDateString();
    } catch (e) {
        return dateStr || '';
    }
}

function formatTime(timeStr) {
    try {
        return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return timeStr || '';
    }
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
    if (!unsafe) return '';
    return unsafe
        .toString()
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
    alert.style.zIndex = '9999';
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

function showError(message) {
    showAlert(message, 'danger');
}

function showSuccess(message) {
    showAlert(message, 'success');
} 