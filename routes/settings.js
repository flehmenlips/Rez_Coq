const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../utils/db-queries');

const settingsRoutes = () => {
    // Get settings
    router.get('/', async (req, res) => {
        try {
            const settings = await getSettings();
            res.json(settings);
        } catch (error) {
            console.error('Error fetching settings:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch settings' });
        }
    });

    // Update settings (admin only)
    router.post('/', async (req, res) => {
        try {
            console.log('Update settings request:', {
                user: req.session?.user,
                body: req.body
            });

            // Check if user is admin
            if (req.session?.user?.role !== 'admin') {
                console.log('Admin access denied:', req.session?.user);
                return res.status(403).json({
                    success: false,
                    message: 'Admin access required'
                });
            }

            const {
                opening_time,
                closing_time,
                slot_duration,
                reservation_window,
                window_update_time
            } = req.body;

            // Validate inputs
            if (!opening_time || !closing_time || !slot_duration) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
            }

            // Validate reservation window
            if (reservation_window < 1 || reservation_window > 365) {
                return res.status(400).json({
                    success: false,
                    message: 'Reservation window must be between 1 and 365 days'
                });
            }

            // Parse values to ensure correct types
            const settings = {
                opening_time: String(opening_time),
                closing_time: String(closing_time),
                slot_duration: parseInt(slot_duration),
                reservation_window: parseInt(reservation_window),
                window_update_time: String(window_update_time)
            };

            console.log('Updating settings with:', settings);

            // Update settings
            await updateSettings(settings);

            res.json({ success: true, message: 'Settings updated successfully' });
        } catch (error) {
            console.error('Error updating settings:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to update settings',
                error: error.message
            });
        }
    });

    return router;
};

module.exports = settingsRoutes;