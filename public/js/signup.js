document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const submitButton = form.querySelector('button');
    submitButton.disabled = true;
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: form.username.value,
                email: form.email.value,
                password: form.password.value
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Account created successfully! Redirecting to login...', 'success');
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
        } else {
            showMessage(result.message || 'Registration failed', 'danger');
        }
    } catch (error) {
        showMessage('Registration failed. Please try again.', 'danger');
    } finally {
        submitButton.disabled = false;
    }
});

function showMessage(message, type) {
    const messageDiv = document.getElementById('signupMessage');
    messageDiv.textContent = message;
    messageDiv.className = `alert alert-${type}`;
    messageDiv.style.display = 'block';
    
    if (type === 'success') {
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 2000);
    }
} 