// Initialize time slots function
function initializeTimeSlots() {
    console.log('Initializing time slots...');
    
    // Get settings from the server
    const settings = {
        opening_time: '11:00',  // Default opening time
        closing_time: '22:00',  // Default closing time
        slot_duration: 30       // Default slot duration in minutes
    };

    const slots = generateTimeSlots(settings.opening_time, settings.closing_time, settings.slot_duration);
    console.log('Generated time slots:', slots);
    
    // Create HTML for time slots
    const slotsHtml = slots.map(time => `
        <div class="time-slot" data-time="${time}">
            ${time}
        </div>
    `).join('');
    
    console.log('Generated HTML:', slotsHtml);
    return slotsHtml;
}

// Generate time slots helper function
function generateTimeSlots(startTime, endTime, intervalMinutes) {
    const slots = [];
    let [startHour, startMinute] = startTime.split(':').map(Number);
    let [endHour, endMinute] = endTime.split(':').map(Number);
    
    let current = new Date();
    current.setHours(startHour, startMinute, 0);
    
    let end = new Date();
    end.setHours(endHour, endMinute, 0);
    
    while (current <= end) {
        slots.push(current.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }));
        current.setMinutes(current.getMinutes() + intervalMinutes);
    }
    
    return slots;
}

// Check date capacity
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

// Document ready handler
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Load settings
        const response = await fetch('/api/settings');
        const settings = await response.json();
        
        // Initialize date picker
        const dateInput = document.getElementById('date');
        if (dateInput) {
            const today = new Date();
            const maxDate = new Date();
            maxDate.setDate(today.getDate() + (settings.rolling_days || 30));

            dateInput.min = today.toISOString().split('T')[0];
            dateInput.max = maxDate.toISOString().split('T')[0];
        }

        // Initialize time picker button
        const timePickerButton = document.getElementById('time-picker-button');
        if (timePickerButton) {
            timePickerButton.addEventListener('click', function() {
                console.log('Time picker clicked');
                
                // Create and append modal
                const modal = document.createElement('div');
                modal.className = 'modal show'; // Add show class immediately
                modal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Select Time</h3>
                            <button type="button" class="close-modal">&times;</button>
                        </div>
                        <div id="time-slots-container" class="time-slots">
                            <!-- Time slots will be inserted here -->
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
                // Generate and insert time slots
                const timeSlotsContainer = modal.querySelector('#time-slots-container');
                const timeSlots = generateTimeSlots('11:00', '22:00', 30);
                timeSlots.forEach(time => {
                    const slot = document.createElement('div');
                    slot.className = 'time-slot';
                    slot.textContent = time;
                    slot.addEventListener('click', () => {
                        document.getElementById('time').value = time;
                        document.getElementById('selected-time-display').textContent = time;
                        modal.remove();
                    });
                    timeSlotsContainer.appendChild(slot);
                });
                
                // Add close button handler
                modal.querySelector('.close-modal').addEventListener('click', () => {
                    modal.remove();
                });
                
                // Close on outside click
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.remove();
                    }
                });
            });
        }

    } catch (error) {
        console.error('Error initializing form:', error);
    }
});

document.getElementById('reservationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const reservation = {
        partySize: parseInt(formData.get('guests')),
        date: formData.get('date'),
        time: formData.get('time'),
        name: formData.get('name'),
        email: formData.get('email')
    };

    try {
        const response = await fetch('/api/reservations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(reservation)
        });
        
        if (!response.ok) {
            throw new Error('Failed to create reservation');
        }
        
        const result = await response.json();
        alert('Reservation created successfully!');
        e.target.reset(); // Reset form
        
    } catch (error) {
        console.error('Error making reservation:', error);
        alert('Error making reservation: ' + error.message);
    }
});

// Update the date input handler
document.getElementById('date').addEventListener('change', async (e) => {
    const date = e.target.value;
    const guestsInput = document.getElementById('guests');
    const timePickerButton = document.getElementById('time-picker-button');
    const selectedTimeDisplay = document.getElementById('selected-time-display');
    
    try {
        const capacity = await checkDateCapacity(date);
        const requestedGuests = parseInt(guestsInput.value) || 1;
        
        if (capacity.remainingCapacity < requestedGuests) {
            timePickerButton.disabled = true;
            selectedTimeDisplay.textContent = 'No availability for this date';
            timePickerButton.classList.add('disabled');
        } else {
            timePickerButton.disabled = false;
            selectedTimeDisplay.textContent = 'Select a time';
            timePickerButton.classList.remove('disabled');
        }
    } catch (error) {
        console.error('Error:', error);
    }
});

// Update guests input handler
document.getElementById('guests').addEventListener('change', async (e) => {
    const date = document.getElementById('date').value;
    if (date) {
        const requestedGuests = parseInt(e.target.value) || 1;
        const capacity = await checkDateCapacity(date);
        
        if (capacity.remainingCapacity < requestedGuests) {
            alert(`Sorry, we only have capacity for ${capacity.remainingCapacity} more guests on this date.`);
            e.target.value = capacity.remainingCapacity;
        }
    }
});