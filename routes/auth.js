const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

const authRoutes = (pool) => {
    // Login route
    router.post('/login', async (req, res) => {
        const { username, password, type } = req.body;
        
        try {
            console.log('Login attempt for:', username, 'type:', type);
            
            const result = await pool.query(
                'SELECT * FROM users WHERE username = $1',
                [username]
            );
            
            const user = result.rows[0];
            
            if (!user) {
                console.log('User not found:', username);
                return res.json({ success: false, message: 'User not found' });
            }
            
            // Verify password
            const validPassword = await bcrypt.compare(password, user.password_hash);
            if (!validPassword) {
                console.log('Invalid password for user:', username);
                return res.json({ success: false, message: 'Invalid password' });
            }
            
            // Check role matches type
            if (type === 'admin' && user.role !== 'admin') {
                console.log('Unauthorized admin access attempt for:', username);
                return res.json({ success: false, message: 'Not authorized as admin' });
            }

            // Set session data directly
            req.session.user = {
                id: user.id,
                username: user.username,
                role: user.role,
                email: user.email
            };
            req.session.created = new Date().getTime();

            // Save session
            try {
                await new Promise((resolve, reject) => {
                    req.session.save((err) => {
                        if (err) {
                            console.error('Session save error:', err);
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });

                console.log('Login successful for:', username);
                console.log('Session data:', {
                    id: req.session.id,
                    user: req.session.user,
                    created: req.session.created
                });

                return res.json({ 
                    success: true, 
                    role: user.role,
                    message: 'Login successful' 
                });
            } catch (saveError) {
                console.error('Failed to save session:', saveError);
                return res.json({ success: false, message: 'Login failed - session error' });
            }
        } catch (error) {
            console.error('Login error:', error);
            return res.json({ success: false, message: 'Login failed - server error' });
        }
    });
    
    // Register route
    router.post('/register', async (req, res) => {
        try {
            const { username, password, email } = req.body;
            
            // Check if user exists
            const existingUser = await pool.query(
                'SELECT id FROM users WHERE username = $1 OR email = $2',
                [username, email]
            );
            
            if (existingUser.rows.length > 0) {
                return res.json({
                    success: false,
                    message: 'Username or email already exists'
                });
            }

            // Hash password
            const passwordHash = await bcrypt.hash(password, 10);

            // Insert new user
            const result = await pool.query(
                `INSERT INTO users (username, password_hash, email, role, created_at)
                 VALUES ($1, $2, $3, 'customer', CURRENT_TIMESTAMP)
                 RETURNING id`,
                [username, passwordHash, email]
            );

            res.json({
                success: true,
                message: 'Registration successful',
                id: result.rows[0].id
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.json({ success: false, message: 'Error creating account' });
        }
    });

    // Check session route
    router.get('/check-session', (req, res) => {
        res.json({
            authenticated: !!req.session?.user,
            user: req.session?.user || null
        });
    });

    // Account settings route
    router.get('/account', async (req, res) => {
        try {
            const result = await pool.query(
                `SELECT id, username, email, role, created_at, last_login 
                 FROM users WHERE id = $1`,
                [req.session.user.id]
            );

            if (result.rows.length === 0) {
                return res.json({ success: false, message: 'User not found' });
            }

            res.json({
                success: true,
                user: result.rows[0]
            });
        } catch (error) {
            console.error('Account settings error:', error);
            res.json({ success: false, message: 'Error retrieving account settings' });
        }
    });

    // Logout route
    router.post('/logout', async (req, res) => {
        if (req.session) {
            try {
                // First, clear the session data
                req.session.user = null;
                
                // Save the cleared session
                await new Promise((resolve, reject) => {
                    req.session.save((err) => {
                        if (err) reject(err);
                        resolve();
                    });
                });
                
                // Then destroy the session
                await new Promise((resolve, reject) => {
                    req.session.destroy((err) => {
                        if (err) reject(err);
                        resolve();
                    });
                });
                
                // Clear session cookie
                res.clearCookie('rez_coq_sid', {
                    path: '/',
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict'
                });
                
                res.json({ 
                    success: true, 
                    message: 'Logged out successfully' 
                });
            } catch (err) {
                console.error('Logout error:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Logout failed' 
                });
            }
        } else {
            // If no session exists, just send success response
            res.json({ 
                success: true, 
                message: 'Already logged out' 
            });
        }
    });
    
    return router;
};

module.exports = authRoutes; 