document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    
    if (form.newPassword.value !== form.confirmPassword.value) {
        showMessage('New passwords do not match', 'danger');
        return;
    }
    
    try {
        const response = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                currentPassword: form.currentPassword.value,
                newPassword: form.newPassword.value
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Password updated successfully', 'success');
            form.reset();
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 2000);
        } else {
            showMessage(result.message || 'Failed to update password', 'danger');
        }
    } catch (error) {
        showMessage('Error updating password', 'danger');
    }
});

function showMessage(message, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.className = `alert alert-${type}`;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 3000);
} 