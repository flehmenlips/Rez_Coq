console.log('Login script loaded');

// Handle login type selection
const loginTypeButtons = document.querySelectorAll('.login-type-selector .btn');
let selectedType = 'customer'; // Default type

loginTypeButtons.forEach(button => {
    button.addEventListener('click', () => {
        loginTypeButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        selectedType = button.dataset.type;
        console.log('Login type selected:', selectedType);
        
        // Show/hide appropriate links
        document.getElementById('customerLinks').style.display = selectedType === 'customer' ? 'block' : 'none';
        document.getElementById('adminLinks').style.display = selectedType === 'admin' ? 'block' : 'none';
    });
});

// Ensure form exists before adding listener
const loginForm = document.getElementById('loginForm');
console.log('Found login form:', !!loginForm);

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        console.log('Form submitted');
        e.preventDefault();
        
        const form = e.target;
        const submitButton = form.querySelector('button[type="submit"]');
        const username = form.username.value;
        const password = form.password.value;
        
        console.log('Form data:', { username, type: selectedType });
        
        // Disable submit button and show loading state
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Logging in...';
        
        try {
            console.log('Sending login request...');
            
            // Clear any existing messages
            showMessage('', '');
            
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    password,
                    type: selectedType
                })
            });
            
            console.log('Response received:', response.status);
            
            const result = await response.json();
            console.log('Login result:', result);
            
            if (result.success) {
                showMessage('Login successful, redirecting...', 'success');
                // Redirect based on role
                window.location.href = result.user?.role === 'admin' ? '/dashboard' : '/';
            } else {
                showMessage(result.message || 'Login failed', 'danger');
                submitButton.disabled = false;
                submitButton.innerHTML = 'Login';
            }
        } catch (error) {
            console.error('Login error:', error);
            showMessage('Login failed. Please check your connection and try again.', 'danger');
            submitButton.disabled = false;
            submitButton.innerHTML = 'Login';
        }
    });
} else {
    console.error('Login form not found - cannot attach submit handler');
}

function showMessage(message, type) {
    const messageDiv = document.getElementById('loginMessage');
    if (!messageDiv) {
        console.error('Message div not found');
        return;
    }
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

console.log('Login script initialization complete'); 