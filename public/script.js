// Add this at the start of your script
async function updateDateInput() {
    try {
        // Fetch rolling days setting
        const response = await fetch('/api/settings');
        const settings = await response.json();
        const rollingDays = parseInt(settings.rolling_days);

        // Set min and max dates
        const dateInput = document.getElementById('date');
        const today = new Date();
        const maxDate = new Date();
        maxDate.setDate(today.getDate() + rollingDays);

        dateInput.min = today.toISOString().split('T')[0];
        dateInput.max = maxDate.toISOString().split('T')[0];
    } catch (error) {
        console.error('Error updating date restrictions:', error);
    }
}

// Add this to your existing DOMContentLoaded event
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('time-slot-modal');
    const timePickerButton = document.getElementById('time-picker-button');
    const closeModal = document.querySelector('.close-modal');
    const selectedTimeDisplay = document.getElementById('selected-time-display');

    // Open modal
    timePickerButton.addEventListener('click', () => {
        modal.classList.add('show');
        initializeTimeSlots();
    });

    // Close modal
    closeModal.addEventListener('click', () => {
        modal.classList.remove('show');
    });

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });

    async function initializeTimeSlots() {
        try {
            const response = await fetch('/api/settings');
            const settings = await response.json();
            
            const slots = generateTimeSlots(
                settings.opening_time || '11:00',
                settings.closing_time || '22:00',
                settings.slot_duration || '30'
            );
            
            const timeSlotsContainer = document.getElementById('timeSlots');
            timeSlotsContainer.innerHTML = '';
            
            slots.forEach(time => {
                const slot = document.createElement('button');
                slot.type = 'button';
                slot.className = 'time-slot';
                slot.textContent = time;
                
                slot.addEventListener('click', () => {
                    document.querySelectorAll('.time-slot').forEach(s => 
                        s.classList.remove('selected'));
                    slot.classList.add('selected');
                    document.getElementById('time').value = time;
                    selectedTimeDisplay.textContent = time;
                    modal.classList.remove('show');
                });
                
                timeSlotsContainer.appendChild(slot);
            });
        } catch (error) {
            console.error('Error loading time slots:', error);
        }
    }

    // Initialize date picker and other existing functionality
    updateDateInput();
});

document.getElementById('reservationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const reservation = Object.fromEntries(formData.entries());

    try {
        const response = await fetch('/api/reservation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(reservation)
        });
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const result = await response.text();
        alert(result);
    } catch (error) {
        alert('Error making reservation: ' + error.message);
    }
});

// Add these functions
function generateTimeSlots(openTime, closeTime, duration) {
    const slots = [];
    const [openHour, openMin] = openTime.split(':').map(Number);
    const [closeHour, closeMin] = closeTime.split(':').map(Number);
    
    let currentTime = new Date();
    currentTime.setHours(openHour, openMin, 0);
    
    const endTime = new Date();
    endTime.setHours(closeHour, closeMin, 0);
    
    while (currentTime < endTime) {
        slots.push(currentTime.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }));
        currentTime.setMinutes(currentTime.getMinutes() + parseInt(duration));
    }
    
    return slots;
}