async function loadAccountDetails() {
    try {
        const response = await fetch('/api/auth/account');
        const data = await response.json();
        
        if (data.success) {
            const user = data.user;
            document.getElementById('accountDetails').innerHTML = `
                <div class="mb-3">
                    <strong>Username:</strong> ${user.username}
                </div>
                <div class="mb-3">
                    <strong>Email:</strong> ${user.email}
                </div>
                <div class="mb-3">
                    <strong>Account Type:</strong> ${user.role}
                </div>
                <div class="mb-3">
                    <strong>Member Since:</strong> ${new Date(user.created_at).toLocaleDateString()}
                </div>
            `;
        } else {
            document.getElementById('accountDetails').innerHTML = 
                '<div class="alert alert-danger">Failed to load account details</div>';
        }
    } catch (error) {
        console.error('Error loading account details:', error);
        document.getElementById('accountDetails').innerHTML = 
            '<div class="alert alert-danger">Error loading account details</div>';
    }
}

document.addEventListener('DOMContentLoaded', loadAccountDetails); 