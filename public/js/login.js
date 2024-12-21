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
        console.log('Attempting login with:', {
            username: form.username.value,
            type: currentLoginType
        });

        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',  // Important for session cookies
            body: JSON.stringify({
                username: form.username.value,
                password: form.password.value,
                type: currentLoginType
            })
        });
        
        console.log('Login response status:', response.status);
        const result = await response.json();
        console.log('Login result:', { success: result.success, role: result.role });
        
        if (result.success) {
            // Wait for session to be saved
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const redirectPath = result.role === 'admin' ? '/dashboard' : '/customer-dashboard';
            console.log('Redirecting to:', redirectPath);
            window.location.replace(redirectPath);  // Use replace instead of href
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
    messageDiv.className = `alert alert-${type}`;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 3000);
}

// Check if we were redirected here
if (window.location.search) {
    console.log('Redirected to login with query:', window.location.search);
} 