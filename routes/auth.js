const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

module.exports = (db) => {
    // Login route
    router.post('/login', async (req, res) => {
        const { username, password } = req.body;
        
        try {
            const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
            
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }
            
            // For first login with default password
            if (user.password_hash === 'CHANGE_ME_ON_FIRST_LOGIN') {
                // Store the new password
                const hashedPassword = await bcrypt.hash(password, 10);
                db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
                    .run(hashedPassword, user.id);
            } else {
                // Verify password
                const validPassword = await bcrypt.compare(password, user.password_hash);
                if (!validPassword) {
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid credentials'
                    });
                }
            }
            
            // Update last login
            db.prepare('UPDATE users SET last_login = datetime("now") WHERE id = ?')
                .run(user.id);
            
            // Set session
            req.session.user = {
                id: user.id,
                username: user.username,
                role: user.role
            };
            
            res.json({
                success: true,
                message: 'Login successful'
            });
            
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    });
    
    // Logout route
    router.post('/logout', (req, res) => {
        req.session.destroy();
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    });
    
    // Add this inside the module.exports function
    router.get('/check-session', (req, res) => {
        res.json({
            authenticated: !!req.session.user,
            user: req.session.user || null
        });
    });
    
    return router;
}; 