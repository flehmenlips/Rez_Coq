const express = require('express');
const router = express.Router();
const pool = require('../utils/db');

const settingsRoutes = () => {
    // Get settings
    router.get('/', async (req, res) => {
        try {
            const client = await pool.connect();
            try {
                const result = await client.query('SELECT * FROM settings');
                const settings = {};
                result.rows.forEach(row => {
                    settings[row.key] = row.value;
                });
                res.json(settings);
            } finally {
                client.release();
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch settings'
            });
        }
    });

    // Update settings (admin only)
    router.post('/', async (req, res) => {
        try {
            // Check if user is admin
            if (req.session?.user?.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Admin access required'
                });
            }

            const {
                opening_time,
                closing_time,
                daily_max_guests,
                max_party_size,
                availability_window,
                window_update_time
            } = req.body;

            // Validate required fields
            if (!opening_time || !closing_time || !daily_max_guests || !max_party_size || !availability_window || !window_update_time) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
            }

            // Validate numeric values
            const maxGuests = parseInt(daily_max_guests);
            const maxParty = parseInt(max_party_size);
            const availWindow = parseInt(availability_window);

            if (isNaN(maxGuests) || maxGuests < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Daily maximum guests must be a positive number'
                });
            }

            if (isNaN(maxParty) || maxParty < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Maximum party size must be a positive number'
                });
            }

            if (maxParty > maxGuests) {
                return res.status(400).json({
                    success: false,
                    message: 'Maximum party size cannot be greater than daily maximum guests'
                });
            }

            if (isNaN(availWindow) || availWindow < 1 || availWindow > 365) {
                return res.status(400).json({
                    success: false,
                    message: 'Availability window must be between 1 and 365 days'
                });
            }

            const client = await pool.connect();
            try {
                // Start transaction
                await client.query('BEGIN');

                // Update each setting
                const settings = {
                    opening_time: String(opening_time),
                    closing_time: String(closing_time),
                    daily_max_guests: String(maxGuests),
                    max_party_size: String(maxParty),
                    availability_window: String(availWindow),
                    window_update_time: String(window_update_time)
                };

                for (const [key, value] of Object.entries(settings)) {
                    await client.query(
                        'UPDATE settings SET value = $1 WHERE key = $2',
                        [value, key]
                    );
                }

                await client.query('COMMIT');
                
                res.json({
                    success: true,
                    message: 'Settings updated successfully'
                });
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } catch (error) {
            console.error('Error updating settings:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update settings'
            });
        }
    });

    return router;
};

module.exports = settingsRoutes;