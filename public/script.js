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

// Call on page load
document.addEventListener('DOMContentLoaded', checkAdminAccess);