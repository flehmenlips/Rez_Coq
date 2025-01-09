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

    // Initialize form submission
    const form = document.getElementById('reservationForm');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const submitButton = document.getElementById('submitButton');
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';

        try {
            const formData = {
                date: document.getElementById('date').value,
                time: document.getElementById('time').value,
                guests: document.getElementById('guests').value,
                name: document.getElementById('name').value,
                email: document.getElementById('email').value
            };

            const response = await fetch('/api/reservations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                // Show confirmation modal with reservation details
                const modal = new bootstrap.Modal(document.getElementById('confirmationModal'));
                const modalBody = document.querySelector('#confirmationModal .modal-body');
                modalBody.innerHTML = `
                    <div class="alert alert-success" role="alert">
                        <h4 class="alert-heading">Thank you for your reservation!</h4>
                        <p>Your reservation has been confirmed for:</p>
                        <hr>
                        <p class="mb-0"><strong>Date:</strong> ${new Date(formData.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <p class="mb-0"><strong>Time:</strong> ${formData.time}</p>
                        <p class="mb-0"><strong>Number of Guests:</strong> ${formData.guests}</p>
                        <p class="mb-0"><strong>Name:</strong> ${formData.name}</p>
                        <p class="mb-0"><strong>Email:</strong> ${formData.email}</p>
                        <hr>
                        <p class="mb-0">A confirmation email will be sent to your email address.</p>
                    </div>
                `;
                
                // Add event listener for when modal is hidden
                const confirmationModal = document.getElementById('confirmationModal');
                confirmationModal.addEventListener('hidden.bs.modal', function () {
                    window.location.href = '/customer-dashboard';
                }, { once: true });
                
                modal.show();
                form.reset();
            } else {
                throw new Error(result.message || 'Failed to create reservation');
            }
        } catch (error) {
            console.error('Error creating reservation:', error);
            const errorModal = new bootstrap.Modal(document.getElementById('errorModal'));
            document.getElementById('errorMessage').textContent = error.message || 'Failed to create reservation. Please try again.';
            errorModal.show();
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Complete Reservation';
        }
    });
});