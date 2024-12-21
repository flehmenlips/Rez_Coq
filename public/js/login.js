document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const submitButton = form.querySelector('button');
    submitButton.disabled = true;
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: form.username.value,
                password: form.password.value
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            if (result.role === 'admin') {
                window.location.href = '/dashboard';
            } else {
                window.location.href = '/customer-dashboard';
            }
        } else {
            showMessage(result.message || 'Login failed', 'danger');
        }
    } catch (error) {
        showMessage('Login failed. Please try again.', 'danger');
    } finally {
        submitButton.disabled = false;
    }
});

function showMessage(message, type) {
    const messageDiv = document.getElementById('loginMessage');
    messageDiv.textContent = message;
    messageDiv.className = `alert alert-${type}`;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 3000);
} 