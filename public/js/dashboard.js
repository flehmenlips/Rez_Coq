// Global variables for sorting and filtering
let currentSort = { field: 'date', direction: 'desc' };
let currentFilters = {
    startDate: null,
    endDate: null,
    search: ''
};
let allReservations = [];

// Load settings
async function loadSettings() {
    try {
        const response = await fetch('/api/settings');
        const settings = await response.json();
        
        console.log('Loaded settings:', settings);
        
        // Populate form fields with settings values
        const inputs = document.querySelectorAll('#settingsForm input');
        inputs.forEach(input => {
            const settingValue = settings[input.id];
            if (settingValue !== undefined) {
                input.value = settingValue;
            }
        });
    } catch (error) {
        console.error('Error loading settings:', error);
        alert('Error loading settings: ' + error.message);
    }
}

// Update statistics
function updateStatistics(reservations) {
    const today = new Date().toISOString().split('T')[0];
    const todayReservations = reservations.filter(r => r.date.startsWith(today));
    const todayGuests = todayReservations.reduce((sum, r) => sum + parseInt(r.guests), 0);
    
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weeklyReservations = reservations.filter(r => new Date(r.date) >= weekStart);
    const pendingEmails = reservations.filter(r => r.email_status === 'pending').length;

    document.getElementById('todayCount').textContent = todayReservations.length;
    document.getElementById('todayGuests').textContent = todayGuests;
    document.getElementById('weeklyTotal').textContent = weeklyReservations.length;
    document.getElementById('pendingEmails').textContent = pendingEmails;
}

// Filter reservations
function filterReservations(reservations) {
    return reservations.filter(reservation => {
        // Date filter
        if (currentFilters.startDate && reservation.date < currentFilters.startDate) return false;
        if (currentFilters.endDate && reservation.date > currentFilters.endDate) return false;
        
        // Search filter
        if (currentFilters.search) {
            const searchTerm = currentFilters.search.toLowerCase();
            return reservation.name.toLowerCase().includes(searchTerm) ||
                   reservation.email.toLowerCase().includes(searchTerm);
        }
        
        return true;
    });
}

// Sort reservations
function sortReservations(reservations) {
    return [...reservations].sort((a, b) => {
        let aVal = a[currentSort.field];
        let bVal = b[currentSort.field];
        
        // Handle date comparison
        if (currentSort.field === 'date' || currentSort.field === 'time') {
            aVal = new Date(`${a.date}T${a.time}`);
            bVal = new Date(`${b.date}T${b.time}`);
        }
        
        // Handle numeric comparison
        if (currentSort.field === 'guests') {
            aVal = parseInt(aVal);
            bVal = parseInt(bVal);
        }
        
        const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        return currentSort.direction === 'asc' ? comparison : -comparison;
    });
}

// Render reservations table
function renderReservationsTable(reservations) {
    const tbody = document.getElementById('reservationsTable');
    tbody.innerHTML = '';
    
    if (reservations.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">No reservations found</td>
            </tr>
        `;
        return;
    }
    
    reservations.forEach(reservation => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(reservation.date).toLocaleDateString()}</td>
            <td>${reservation.time}</td>
            <td>${reservation.name}</td>
            <td>${reservation.email}</td>
            <td>${reservation.guests}</td>
            <td>
                <span class="badge bg-${reservation.email_status === 'sent' ? 'success' : 'warning'}">
                    ${reservation.email_status}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editReservation('${reservation.id}')">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="cancelReservation('${reservation.id}')">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Load and display reservations
async function loadReservations() {
    const spinner = document.getElementById('loadingSpinner');
    spinner.classList.remove('d-none');
    
    try {
        const response = await fetch('/api/reservations');
        if (!response.ok) throw new Error('Failed to load reservations');
        
        allReservations = await response.json();
        updateStatistics(allReservations);
        
        const filtered = filterReservations(allReservations);
        const sorted = sortReservations(filtered);
        renderReservationsTable(sorted);
    } catch (error) {
        console.error('Error loading reservations:', error);
        document.getElementById('reservationsTable').innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger">
                    Error loading reservations: ${error.message}
                </td>
            </tr>
        `;
    } finally {
        spinner.classList.add('d-none');
    }
}

// Edit reservation
async function editReservation(id) {
    // Implementation will be added later
    alert('Edit functionality coming soon!');
}

// Cancel reservation
async function cancelReservation(id) {
    if (!confirm('Are you sure you want to cancel this reservation?')) return;
    
    try {
        const response = await fetch(`/api/reservations/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to cancel reservation');
        
        await loadReservations();
        alert('Reservation cancelled successfully!');
    } catch (error) {
        console.error('Error cancelling reservation:', error);
        alert('Failed to cancel reservation: ' + error.message);
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadReservations();
    
    // Sort headers
    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const field = th.dataset.sort;
            if (currentSort.field === field) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.field = field;
                currentSort.direction = 'asc';
            }
            const sorted = sortReservations(filterReservations(allReservations));
            renderReservationsTable(sorted);
        });
    });
    
    // Filter controls
    document.getElementById('applyFilters').addEventListener('click', () => {
        currentFilters.startDate = document.getElementById('startDate').value;
        currentFilters.endDate = document.getElementById('endDate').value;
        currentFilters.search = document.getElementById('searchInput').value;
        const filtered = filterReservations(allReservations);
        const sorted = sortReservations(filtered);
        renderReservationsTable(sorted);
    });
    
    document.getElementById('resetFilters').addEventListener('click', () => {
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = '';
        document.getElementById('searchInput').value = '';
        currentFilters = { startDate: null, endDate: null, search: '' };
        const sorted = sortReservations(allReservations);
        renderReservationsTable(sorted);
    });
});

// Save settings
document.getElementById('settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const formData = new FormData(e.target);
        const settings = {
            daily_max_guests: formData.get('daily_max_guests'),
            max_party_size: formData.get('max_party_size'),
            opening_time: formData.get('opening_time'),
            closing_time: formData.get('closing_time'),
            slot_duration: formData.get('slot_duration'),
            reservation_window: formData.get('reservation_window'),
            window_update_time: formData.get('window_update_time')
        };
        
        console.log('Saving settings:', settings);
        
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(error);
        }
        
        const result = await response.json();
        if (result.success) {
            alert('Settings saved successfully!');
            // Reload settings to confirm changes
            await loadSettings();
        } else {
            throw new Error(result.message || 'Failed to save settings');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Error saving settings: ' + error.message);
    }
});

// Load settings on page load
document.addEventListener('DOMContentLoaded', loadSettings);

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadReservations();
});

// Add logout handler
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin'
        });
        
        if (response.ok) {
            console.log('Logout successful');
            window.location.href = '/login';
        } else {
            console.error('Logout failed:', await response.text());
        }
    } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to logout. Please try again.');
    }
});

// Database viewer
document.getElementById('viewDbBtn').addEventListener('click', async () => {
    try {
        const response = await fetch('/api/admin/db-view');
        if (!response.ok) {
            const error = await response.text();
            throw new Error(error);
        }
        
        const data = await response.json();
        console.log('Database contents:', data);
        
        // Format the data for display
        const formattedData = {
            Users: data.users.map(user => ({
                Username: user.username,
                Email: user.email,
                Role: user.role,
                Created: new Date(user.created_at).toLocaleString()
            })),
            Reservations: data.reservations.map(res => ({
                Name: res.name,
                Date: new Date(res.date).toLocaleDateString(),
                Time: res.time,
                Guests: res.guests,
                Email: res.email,
                Status: res.email_status
            })),
            Settings: data.settings.map(setting => ({
                Setting: setting.key,
                Value: setting.value
            }))
        };
        
        // Create formatted output
        const output = Object.entries(formattedData)
            .map(([section, items]) => {
                return `
                    <h4 class="mt-4">${section}</h4>
                    <pre class="bg-light p-3 rounded">
${JSON.stringify(items, null, 2)}
                    </pre>
                `;
            })
            .join('\n');
        
        document.getElementById('dbContent').innerHTML = output;
        
        // Show the modal
        new bootstrap.Modal(document.getElementById('dbViewer')).show();
    } catch (error) {
        console.error('Error viewing database:', error);
        alert('Failed to load database contents: ' + error.message);
    }
}); 