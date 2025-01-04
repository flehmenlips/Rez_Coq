async function generateTimeSlots(openTime, closeTime, duration) {
    try {
        // Parse times using a fixed date for comparison
        const baseDate = '2000-01-01 ';
        const openDateTime = new Date(baseDate + openTime);
        const closeDateTime = new Date(baseDate + closeTime);
        const slots = [];
        
        // Start at opening time
        let currentTime = new Date(openDateTime);
        
        // Generate slots until closing time
        // Subtract duration to ensure last booking ends by closing time
        while (currentTime <= new Date(closeDateTime.getTime() - duration * 60000)) {
            slots.push(currentTime.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            }));
            currentTime.setMinutes(currentTime.getMinutes() + parseInt(duration));
        }
        
        return slots;
    } catch (error) {
        console.error('Error generating time slots:', error);
        throw error;
    }
}

// Add at the start of the file
// Check if user is admin and show admin nav if so
async function checkAdminAccess() {
    try {
        const response = await fetch('/api/auth/check-session');
        const result = await response.json();
        if (result.authenticated && result.user.role === 'admin') {
            document.getElementById('adminNav').style.display = 'block';
        }
    } catch (error) {
        console.error('Error checking admin access:', error);
    }
}

// Date handling functions
function getMinDate() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

function getMaxDate() {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 60); // 60 days from today
    return maxDate;
}

function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
}

// Initialize date picker with restrictions
function initializeDatePicker() {
    const dateInput = document.getElementById('date');
    const minDate = getMinDate();
    const maxDate = getMaxDate();

    dateInput.min = formatDateForInput(minDate);
    dateInput.max = formatDateForInput(maxDate);
    
    // Set default value to today if within business hours, otherwise tomorrow
    const now = new Date();
    const defaultDate = now.getHours() < 20 ? now : new Date(now.setDate(now.getDate() + 1));
    dateInput.value = formatDateForInput(defaultDate);

    // Add change event listener
    dateInput.addEventListener('change', function(e) {
        const selectedDate = new Date(e.target.value);
        const dateFeedback = document.getElementById('dateFeedback');
        
        if (selectedDate < minDate) {
            dateFeedback.textContent = "Please select a future date";
            dateFeedback.style.display = "block";
            e.target.value = formatDateForInput(minDate);
        } else if (selectedDate > maxDate) {
            dateFeedback.textContent = "Please select a date within 60 days";
            dateFeedback.style.display = "block";
            e.target.value = formatDateForInput(maxDate);
        } else {
            dateFeedback.style.display = "none";
            loadAvailableTimeSlots(e.target.value);
        }
    });

    // Initial load of time slots
    loadAvailableTimeSlots(dateInput.value);
}

// Add at the start of the file
async function checkAuthentication() {
    try {
        const response = await fetch('/api/auth/check-session');
        const result = await response.json();
        if (!result.success || !result.user) {
            window.location.href = '/login.html';
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error checking authentication:', error);
        window.location.href = '/login.html';
        return false;
    }
}

// Enhanced time slot loading
async function loadAvailableTimeSlots(selectedDate) {
    const timeSelect = document.getElementById('time');
    const loadingIndicator = document.getElementById('timeSlotLoading');
    
    try {
        timeSelect.disabled = true;
        loadingIndicator.style.display = 'block';
        
        const response = await fetch(`/api/reservations/available-times?date=${selectedDate}`);
        const data = await response.json();
        
        // Clear existing options
        timeSelect.innerHTML = '';
        
        if (!data.success || !data.slots || data.slots.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = data.message || 'No available times for this date';
            timeSelect.appendChild(option);
        } else {
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Select a time';
            timeSelect.appendChild(defaultOption);
            
            data.slots.forEach(time => {
                const option = document.createElement('option');
                option.value = time;
                option.textContent = time;
                timeSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading time slots:', error);
        timeSelect.innerHTML = '<option value="">Error loading available times</option>';
    } finally {
        timeSelect.disabled = false;
        loadingIndicator.style.display = 'none';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication first
    if (!await checkAuthentication()) {
        return;
    }
    
    initializeDatePicker();
    checkAdminAccess();
    
    // Initialize all tooltips
    const tooltips = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltips.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});