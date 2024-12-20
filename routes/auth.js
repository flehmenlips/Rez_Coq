const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

module.exports = (db) => {
    // Verify database connection at router initialization
    try {
        const dbCheck = db.prepare('SELECT 1').get();
        console.log('Auth router: Database connection verified');
    } catch (error) {
        console.error('Auth router: Database connection failed:', error);
        throw error;
    }

    // Login route
    router.post('/login', async (req, res) => {
        const { username, password } = req.body;
        
        try {
            console.log('Login attempt:', {
                hasUsername: !!username,
                hasPassword: !!password,
                body: req.body,
                headers: req.headers
            });
            const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
            
            console.log('Database query result:', { 
                userFound: !!user,
                userData: user ? {
                    id: user.id,
                    username: user.username,
                    hasDefaultPassword: user.password_hash === 'CHANGE_ME_ON_FIRST_LOGIN'
                } : null
            });
            
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }
            
            try {
                if (user.password_hash === 'CHANGE_ME_ON_FIRST_LOGIN') {
                    console.log('First login detected, updating password');
                    const hashedPassword = await bcrypt.hash(password, 10);
                    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
                        .run(hashedPassword, user.id);
                } else {
                    console.log('Verifying password');
                    const validPassword = await bcrypt.compare(password, user.password_hash);
                    if (!validPassword) {
                        return res.status(401).json({
                            success: false,
                            message: 'Invalid credentials'
                        });
                    }
                }
            } catch (bcryptError) {
                console.error('Bcrypt error:', bcryptError);
                throw bcryptError;
            }
            
            // Update last login
            db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?')
                .run(user.id);
            
            // Set session
            req.session.user = {
                id: user.id,
                username: user.username,
                role: user.role
            };
            
            res.json({
                success: true,
                message: 'Login successful',
                role: user.role
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
    
    // Add this inside the module.exports function
    router.post('/change-password', async (req, res) => {
        const { currentPassword, newPassword } = req.body;
        
        try {
            const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
            
            const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
            if (!validPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }
            
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
                .run(hashedPassword, user.id);
            
            res.json({
                success: true,
                message: 'Password updated successfully'
            });
            
        } catch (error) {
            console.error('Password change error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    });
    
    // Add this inside the module.exports function
    router.post('/register', async (req, res) => {
        const { username, password, email } = req.body;
        
        try {
            // Check if user already exists
            const existingUser = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?')
                .get(username, email);
            
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Username or email already exists'
                });
            }
            
            // Create new user
            const hashedPassword = await bcrypt.hash(password, 10);
            const result = db.prepare(`
                INSERT INTO users (username, password_hash, email, role)
                VALUES (?, ?, ?, 'customer')
            `).run(username, hashedPassword, email);
            
            res.json({
                success: true,
                message: 'Registration successful'
            });
            
        } catch (error) {
            console.error('Registration error:', {
                error: error.message,
                stack: error.stack,
                username,
                email
            });
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    });
    
    return router;
}; 