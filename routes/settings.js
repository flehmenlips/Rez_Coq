const express = require('express');
const router = express.Router();
const { getSettings, updateSetting } = require('../utils/db-queries');

const settingsRoutes = () => {
    // Get all settings
    router.get('/', async (req, res) => {
        try {
            const settings = await getSettings();
            // Convert settings object to array format
            const settingsArray = Object.entries(settings).map(([key, value]) => ({
                key,
                value
            }));
            res.json(settingsArray);
        } catch (error) {
            console.error('Error fetching settings:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch settings' });
        }
    });

    // Update settings
    router.post('/', async (req, res) => {
        try {
            const updates = req.body;
            for (const [key, value] of Object.entries(updates)) {
                await updateSetting(key, value);
            }
            res.json({ success: true, message: 'Settings updated' });
        } catch (error) {
            console.error('Error updating settings:', error);
            res.status(500).json({ success: false, message: 'Failed to update settings' });
        }
    });

    return router;
};

module.exports = settingsRoutes;