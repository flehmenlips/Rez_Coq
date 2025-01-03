const express = require('express');
const router = express.Router();
const { query } = require('../utils/db');

// Get settings
router.get('/', async (req, res) => {
    try {
        const result = await query('SELECT key, value FROM settings');
        
        // Convert rows to object
        const settings = result.rows.reduce((acc, row) => {
            acc[row.key] = row.value;
            return acc;
        }, {});
        
        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch settings',
            error: error.message 
        });
    }
});

// Update settings
router.post('/', async (req, res) => {
    try {
        const settings = req.body;
        console.log('Updating settings:', settings);

        // Delete existing settings and insert new ones
        await query('DELETE FROM settings');
        
        for (const [key, value] of Object.entries(settings)) {
            await query(
                'INSERT INTO settings (key, value) VALUES ($1, $2)',
                [key, String(value)]
            );
        }
        
        res.json({ 
            success: true,
            message: 'Settings updated successfully' 
        });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to update settings',
            error: error.message 
        });
    }
});

module.exports = router;