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
            window.location.href = '/dashboard';
        } else {
            showLoginError(result.message || 'Login failed');
        }
    } catch (error) {
        showLoginError('Login failed. Please try again.');
    } finally {
        submitButton.disabled = false;
    }
});

function showLoginError(message) {
    const messageDiv = document.getElementById('loginMessage');
    messageDiv.textContent = message;
    messageDiv.className = 'alert alert-danger';
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 3000);
} 