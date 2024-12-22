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
            
            console.log('Login attempt:', {
                username,
                userFound: !!user,
                sessionId: req.sessionID
            });

            if (!user) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            // Verify password
            const match = await bcrypt.compare(password, user.password_hash);

            if (!match) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            // Set session
            req.session.user = { 
                id: user.id, 
                username: user.username, 
                role: user.role 
            };
            await new Promise((resolve) => req.session.save(resolve));

            res.json({ 
                success: true, 
                message: 'Login successful',
                role: user.role
            });
        } catch (error) {
            console.error('Login error:', error);
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

    // Add account settings route
    router.get('/account', (req, res) => {
        try {
            const user = db.prepare(`
                SELECT id, username, email, role, created_at, last_login 
                FROM users WHERE id = ?
            `).get(req.session.user.id);

            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            // Remove sensitive data
            delete user.password_hash;
            
            res.json({
                success: true,
                user: user
            });
        } catch (error) {
            console.error('Account settings error:', error);
            res.status(500).json({ success: false, message: 'Error retrieving account settings' });
        }
    });

    // Add logout route
    router.post('/logout', (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                console.error('Logout error:', err);
                return res.status(500).json({ success: false, message: 'Logout failed' });
            }
            res.clearCookie('rez_coq_session');
            res.clearCookie('connect.sid');
            res.set({
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            res.status(200).json({ success: true, message: 'Logged out successfully' });
        });
    });

    return router;
}; 