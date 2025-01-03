const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { query } = require('../utils/db');

// Login route
router.post('/login', async (req, res) => {
    try {
        const { username, password, type } = req.body;
        console.log('Login attempt:', { username, type });

        // Get user from database
        const result = await query(
            'SELECT * FROM users WHERE (username = $1 OR email = $1) AND role = $2',
            [username, type === 'admin' ? 'admin' : 'customer']
        );

        if (result.rows.length === 0) {
            console.log('User not found or incorrect role');
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        const user = result.rows[0];

        // Check password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            console.log('Invalid password');
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        // Update last login
        await query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        // Set session data
        req.session.user = {
            id: user.id,
            username: user.username,
            role: user.role,
            email: user.email
        };

        console.log('Login successful:', { userId: user.id, role: user.role });

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message
        });
    }
});

// Register route
router.post('/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;

        // Check if username exists
        const existingUser = await query(
            'SELECT * FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Username or email already exists'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create user
        const result = await query(
            `INSERT INTO users (username, password_hash, email, role, verified)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, username, email, role`,
            [username, passwordHash, email, 'customer', false]
        );

        const user = result.rows[0];

        // Set session data
        req.session.user = {
            id: user.id,
            username: user.username,
            role: user.role,
            email: user.email
        };

        res.json({
            success: true,
            message: 'Registration successful',
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
});

// Logout route
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({
                success: false,
                message: 'Logout failed',
                error: err.message
            });
        }
        res.json({
            success: true,
            message: 'Logout successful'
        });
    });
});

// Check session route
router.get('/check-session', (req, res) => {
    if (req.session?.user) {
        res.json({
            success: true,
            user: req.session.user
        });
    } else {
        res.status(401).json({
            success: false,
            message: 'No active session'
        });
    }
});

module.exports = router; 