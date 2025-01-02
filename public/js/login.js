let currentLoginType = 'customer';

// Handle login type selection
document.querySelectorAll('.login-type-selector .btn').forEach(button => {
    button.addEventListener('click', (e) => {
        // Update buttons
        document.querySelectorAll('.login-type-selector .btn').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');

        // Update login type
        currentLoginType = e.target.dataset.type;

        // Show/hide appropriate links
        document.getElementById('customerLinks').style.display = 
            currentLoginType === 'customer' ? 'block' : 'none';
        document.getElementById('adminLinks').style.display = 
            currentLoginType === 'admin' ? 'block' : 'none';
    });
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const submitButton = form.querySelector('button');
    submitButton.disabled = true;
    
    try {
        console.log('Attempting login with type:', currentLoginType);
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
                username: form.username.value,
                password: form.password.value,
                type: currentLoginType
            })
        });
        
        console.log('Login response status:', response.status);
        const result = await response.json();
        console.log('Login result:', result);
        
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
        console.error('Login error:', error);
        showMessage('Login failed. Please try again.', 'danger');
    } finally {
        submitButton.disabled = false;
    }
});

function showMessage(message, type) {
    const messageDiv = document.getElementById('loginMessage');
    messageDiv.textContent = message;
    messageDiv.className = `alert alert-${type} mt-3`;
    messageDiv.style.display = 'block';
    
    // Clear message after 5 seconds
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

// Check if we were redirected here
if (window.location.search) {
    const params = new URLSearchParams(window.location.search);
    if (params.has('error')) {
        showMessage(params.get('error'), 'danger');
    }
} 