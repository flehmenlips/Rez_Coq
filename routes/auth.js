const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

module.exports = (db) => {
    console.log('Auth router: Database connection verified');
    
    // Login route
    router.post('/login', async (req, res) => {
        console.log('Login attempt:', {
            hasUsername: !!req.body.username,
            hasPassword: !!req.body.password,
            body: req.body,
            headers: req.headers
        });

        try {
            const { username, password } = req.body;
            
            // Query user
            const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
            console.log('Database query result:', {
                userFound: !!user,
                userData: user ? { id: user.id, username: user.username, hasDefaultPassword: user.password_hash === 'CHANGE_ME_ON_FIRST_LOGIN' } : null
            });

            if (!user) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            // Check for default password
            if (user.password_hash === 'CHANGE_ME_ON_FIRST_LOGIN' && password === 'CHANGE_ME_ON_FIRST_LOGIN') {
                req.session.user = { id: user.id, username: user.username, role: user.role };
                return res.json({ 
                    success: true, 
                    message: 'Please change your password',
                    requirePasswordChange: true,
                    role: user.role
                });
            }

            console.log('Verifying password');
            // Verify password
            const match = await bcrypt.compare(password, user.password_hash);
            if (!match) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            // Update last login
            db.prepare('UPDATE users SET last_login = datetime("now") WHERE id = ?').run(user.id);

            // Set session
            req.session.user = { id: user.id, username: user.username, role: user.role };
            
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

    return router;
}; 