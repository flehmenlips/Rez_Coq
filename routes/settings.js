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
                window_update_time,
                daily_max_guests,
                max_party_size
            } = req.body;

            // Validate inputs
            if (!opening_time || !closing_time || !slot_duration || !daily_max_guests || !max_party_size) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
            }

            // Validate numeric values
            const maxGuests = parseInt(daily_max_guests);
            const maxParty = parseInt(max_party_size);
            const slotDur = parseInt(slot_duration);
            const resWindow = parseInt(reservation_window);

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

            // Validate reservation window
            if (resWindow < 1 || resWindow > 365) {
                return res.status(400).json({
                    success: false,
                    message: 'Reservation window must be between 1 and 365 days'
                });
            }

            // Parse values to ensure correct types
            const settings = {
                opening_time: String(opening_time),
                closing_time: String(closing_time),
                slot_duration: slotDur,
                reservation_window: resWindow,
                window_update_time: String(window_update_time),
                daily_max_guests: maxGuests,
                max_party_size: maxParty
            };

            // Update settings
            await updateSettings(settings);
            
            res.json({
                success: true,
                message: 'Settings updated successfully'
            });
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