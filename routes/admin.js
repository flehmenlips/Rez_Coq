const express = require('express');
const router = express.Router();
const pool = require('../utils/db');

const adminRoutes = () => {
    // View database contents
    router.get('/db-view', async (req, res) => {
        try {
            // Check if user is admin
            if (req.session?.user?.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Admin access required'
                });
            }

            const client = await pool.connect();
            try {
                // Get all tables data
                const users = await client.query('SELECT * FROM users');
                const reservations = await client.query('SELECT * FROM reservations');
                const settings = await client.query('SELECT * FROM settings');

                // Format response
                const dbContents = {
                    users: users.rows.map(user => ({
                        ...user,
                        password_hash: '[REDACTED]' // Don't send password hashes
                    })),
                    reservations: reservations.rows,
                    settings: settings.rows
                };

                res.json(dbContents);
            } finally {
                client.release();
            }
        } catch (error) {
            console.error('Error viewing database:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to view database contents',
                error: error.message
            });
        }
    });

    return router;
};

module.exports = adminRoutes; 