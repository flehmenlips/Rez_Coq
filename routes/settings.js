const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../utils/db-queries');
const { requireAdmin } = require('../middleware/auth');

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
    router.post('/', requireAdmin, async (req, res) => {
        try {
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

            // Update settings
            await updateSettings({
                opening_time,
                closing_time,
                slot_duration,
                reservation_window,
                window_update_time
            });

            res.json({ success: true, message: 'Settings updated successfully' });
        } catch (error) {
            console.error('Error updating settings:', error);
            res.status(500).json({ success: false, message: 'Failed to update settings' });
        }
    });

    return router;
};

module.exports = settingsRoutes;