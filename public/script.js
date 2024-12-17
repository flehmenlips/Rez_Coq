document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Load settings
        const response = await fetch('/api/settings');
        const settings = await response.json();
        console.log('Loaded settings:', settings); // Debug log
        
        const operatingDays = settings.operating_days ? JSON.parse(settings.operating_days) : [];
        console.log('Operating days:', operatingDays); // Debug log
        
        const rollingDays = parseInt(settings.rolling_days);
        console.log('Rolling days:', rollingDays); // Debug log

        // Set up date constraints
        const dateInput = document.getElementById('date');
        const today = new Date();
        const maxDate = new Date();
        maxDate.setDate(today.getDate() + rollingDays);

        dateInput.min = today.toISOString().split('T')[0];
        dateInput.max = maxDate.toISOString().split('T')[0];

        // Handle date selection
        dateInput.addEventListener('change', async function() {
            if (!this.value) return;
            
            const selectedDate = new Date(this.value);
            const dayOfWeek = selectedDate.toLocaleString('en-US', { weekday: 'long' });
            
            if (!operatingDays.includes(dayOfWeek)) {
                showError(`We're closed on ${dayOfWeek}s`);
                this.value = '';
                return;
            }

            // Check capacity and update time slots
            const capacity = await checkDateCapacity(this.value);
            updateTimeSlotAvailability(capacity.remainingCapacity > 0);
        });

        // Initialize time picker
        initializeTimePicker();

    } catch (error) {
        console.error('Error loading settings:', error);
        showError('Error loading settings');
    }
});

function initializeTimePicker() {
    const timePickerButton = document.getElementById('time-picker-button');
    const timeInput = document.getElementById('time');

    timePickerButton.addEventListener('click', function() {
        if (this.disabled) return;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Select Time</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="time-slots">
                    ${generateTimeSlots()}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle time slot selection
        modal.addEventListener('click', function(e) {
            if (e.target.classList.contains('time-slot')) {
                const selectedTime = e.target.dataset.time;
                timeInput.value = selectedTime;
                document.getElementById('selected-time-display').textContent = selectedTime;
                modal.remove();
            } else if (e.target.classList.contains('close-modal') || e.target === modal) {
                modal.remove();
            }
        });
    });
}

function generateTimeSlots() {
    const slots = [];
    for (let hour = 11; hour < 22; hour++) {
        for (let minute of ['00', '30']) {
            const timeString = `${hour.toString().padStart(2, '0')}:${minute}`;
            slots.push(`<div class="time-slot" data-time="${timeString}">${timeString}</div>`);
        }
    }
    return slots.join('');
}

async function checkDateCapacity(date) {
    try {
        const response = await fetch(`/api/capacity/${date}`);
        if (!response.ok) throw new Error('Failed to check capacity');
        return await response.json();
    } catch (error) {
        console.error('Error checking capacity:', error);
        throw error;
    }
}

function showError(message) {
    const errorDiv = document.getElementById('error-message') || createErrorDiv();
    errorDiv.textContent = message;
    errorDiv.style.opacity = '1';
    
    setTimeout(() => {
        errorDiv.style.opacity = '0';
    }, 3000);
}

function createErrorDiv() {
    const errorDiv = document.createElement('div');
    errorDiv.id = 'error-message';
    errorDiv.className = 'error-message';
    document.querySelector('#reservationForm').prepend(errorDiv);
    return errorDiv;
}

function updateTimeSlotAvailability(isAvailable) {
    const timePickerButton = document.getElementById('time-picker-button');
    const selectedTimeDisplay = document.getElementById('selected-time-display');
    
    if (!isAvailable) {
        timePickerButton.disabled = true;
        selectedTimeDisplay.textContent = 'No availability for this date';
        timePickerButton.classList.add('disabled');
    } else {
        timePickerButton.disabled = false;
        selectedTimeDisplay.textContent = 'Select a time';
        timePickerButton.classList.remove('disabled');
    }
}