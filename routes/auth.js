const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

module.exports = (db) => {
    console.log('Auth router: Database connection verified');
    
    // Login route
    router.post('/login', async (req, res) => {
        try {
            const { username, password } = req.body;
            
            // Query user
            const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
            
            console.log('Login attempt details:', {
                usernameProvided: !!username,
                userFound: !!user,
                sessionExists: !!req.session
            });

            if (!user) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            // Verify password
            const match = await bcrypt.compare(password, user.password_hash);
            console.log('Password verification:', { match });

            if (!match) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            // Set session
            req.session.user = { 
                id: user.id, 
                username: user.username, 
                role: user.role 
            };
            console.log('Session set:', req.session);

            res.json({ 
                success: true, 
                message: 'Login successful',
                role: user.role
            });
        } catch (error) {
            console.error('Login error:', {
                error: error.message,
                stack: error.stack,
                session: req.session,
                username: req.body.username
            });
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Register route
    router.post('/register', async (req, res) => {
        try {
            const { username, password, email } = req.body;
            
            // Check if user exists
            const existingUser = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?')
                .get(username, email);
            
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Username or email already exists'
                });
            }

            // Hash password
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            // Insert new user
            const result = db.prepare(`
                INSERT INTO users (username, password_hash, email, role, created_at)
                VALUES (?, ?, ?, 'customer', datetime('now'))
            `).run(username, passwordHash, email);

            res.json({
                success: true,
                message: 'Registration successful',
                id: result.lastInsertRowid
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating account'
            });
        }
    });

    // Check session route
    router.get('/check-session', (req, res) => {
        res.json({
            authenticated: !!req.session?.user,
            user: req.session?.user || null
        });
    });

    return router;
}; 