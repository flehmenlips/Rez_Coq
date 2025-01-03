console.log('Register script loaded');

const registerForm = document.getElementById('registerForm');
console.log('Found register form:', !!registerForm);

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        console.log('Form submitted');
        e.preventDefault();
        
        const form = e.target;
        const submitButton = form.querySelector('button');
        const username = form.username.value;
        const email = form.email.value;
        const password = form.password.value;
        const confirmPassword = form.confirmPassword.value;
        
        // Validate passwords match
        if (password !== confirmPassword) {
            showMessage('Passwords do not match', 'danger');
            return;
        }
        
        // Disable submit button and show loading state
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Registering...';
        
        try {
            console.log('Sending registration request...');
            
            // Clear any existing messages
            showMessage('', '');
            
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    email,
                    password
                })
            });
            
            console.log('Response received:', response.status);
            const result = await response.json();
            console.log('Registration result:', result);
            
            if (response.ok && result.success) {
                showMessage('Registration successful! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            } else {
                showMessage(result.message || 'Registration failed', 'danger');
                submitButton.disabled = false;
                submitButton.textContent = 'Register';
            }
        } catch (error) {
            console.error('Registration error:', error);
            showMessage('Registration failed. Please try again.', 'danger');
            submitButton.disabled = false;
            submitButton.textContent = 'Register';
        }
    });
} else {
    console.error('Register form not found - cannot attach submit handler');
}

function showMessage(message, type) {
    const messageDiv = document.getElementById('registerMessage');
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

console.log('Register script initialization complete'); 