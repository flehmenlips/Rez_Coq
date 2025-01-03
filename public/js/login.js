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
    const username = form.username.value;
    const password = form.password.value;
    
    // Disable submit button and show loading state
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Logging in...';
    
    try {
        console.log('Login attempt:', { username, type: currentLoginType });
        
        // Clear any existing messages
        showMessage('', '');
        
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                username,
                password,
                type: currentLoginType
            })
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries([...response.headers]));
        
        const result = await response.json();
        console.log('Login result:', result);
        
        if (result.success) {
            showMessage('Login successful, redirecting...', 'success');
            setTimeout(() => {
                window.location.href = result.role === 'admin' ? '/dashboard' : '/customer-dashboard';
            }, 500);
        } else {
            showMessage(result.message || 'Login failed', 'danger');
            submitButton.disabled = false;
            submitButton.textContent = 'Login';
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Login failed. Please try again.', 'danger');
        submitButton.disabled = false;
        submitButton.textContent = 'Login';
    }
});

function showMessage(message, type) {
    const messageDiv = document.getElementById('loginMessage');
    if (!message) {
        messageDiv.style.display = 'none';
        return;
    }
    messageDiv.textContent = message;
    messageDiv.className = `alert alert-${type} mt-3`;
    messageDiv.style.display = 'block';
    
    if (type !== 'success') {
        // Clear error messages after 5 seconds
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }
}

// Check if we were redirected here
if (window.location.search) {
    const params = new URLSearchParams(window.location.search);
    if (params.has('error')) {
        showMessage(params.get('error'), 'danger');
    }
} 