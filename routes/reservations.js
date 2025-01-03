const express = require('express');
const router = express.Router();
const { query } = require('../utils/db');

// Get available times
router.get('/available-times', async (req, res) => {
    try {
        console.log('Fetching available times');
        
        // Get settings in a single query
        const settingsResult = await query(`
            SELECT key, value FROM settings 
            WHERE key IN ('opening_time', 'closing_time', 'slot_duration')
        `);
        
        // Convert settings to object with defaults
        const settings = settingsResult.rows.reduce((acc, row) => {
            acc[row.key] = row.value;
            return acc;
        }, {
            opening_time: '11:00',
            closing_time: '22:00',
            slot_duration: '60'
        });

        console.log('Settings loaded:', settings);

        // Parse times
        const openTime = settings.opening_time;
        const closeTime = settings.closing_time;
        const duration = parseInt(settings.slot_duration);

        if (!openTime || !closeTime || isNaN(duration)) {
            console.error('Invalid settings:', { openTime, closeTime, duration });
            return res.status(500).json({
                success: false,
                message: 'Invalid time settings'
            });
        }

        // Generate time slots
        const slots = [];
        let currentTime = new Date(`2000-01-01 ${openTime}`);
        const endTime = new Date(`2000-01-01 ${closeTime}`);

        while (currentTime < endTime) {
            slots.push(currentTime.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit', 
                hour12: true 
            }));
            currentTime.setMinutes(currentTime.getMinutes() + duration);
        }

        console.log(`Generated ${slots.length} time slots`);
        res.json({
            success: true,
            slots: slots
        });
    } catch (error) {
        console.error('Error getting available times:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to get available times',
            error: error.message 
        });
    }
});

// Get all reservations
router.get('/', async (req, res) => {
    try {
        const result = await query(
            'SELECT * FROM reservations ORDER BY date, time'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching reservations:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch reservations',
            error: error.message 
        });
    }
});

// Create new reservation
router.post('/', async (req, res) => {
    try {
        const { date, time, name, email, phone, guests } = req.body;

        // Validate required fields
        if (!date || !time || !name || !email || !guests) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Get settings for validation
        const settingsResult = await query('SELECT * FROM settings');
        const settings = {};
        settingsResult.rows.forEach(row => {
            settings[row.key] = row.value;
        });

        const maxPartySize = parseInt(settings.max_party_size || 12);
        const dailyMaxGuests = parseInt(settings.daily_max_guests || 100);

        // Validate party size
        if (parseInt(guests) > maxPartySize) {
            return res.status(400).json({
                success: false,
                message: `Party size cannot exceed ${maxPartySize} guests`
            });
        }

        // Get total guests for the day
        const existingReservations = await query(
            'SELECT COALESCE(SUM(guests), 0) as total_guests FROM reservations WHERE date = $1',
            [date]
        );

        const currentTotal = parseInt(existingReservations.rows[0].total_guests);
        const newTotal = currentTotal + parseInt(guests);

        // Validate against daily maximum
        if (newTotal > dailyMaxGuests) {
            return res.status(400).json({
                success: false,
                message: `Cannot exceed ${dailyMaxGuests} total guests per day. Currently ${currentTotal} guests reserved.`
            });
        }

        // Create the reservation
        const result = await query(
            `INSERT INTO reservations 
             (name, email, phone, date, time, guests, status, email_status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
             RETURNING *`,
            [name, email, phone, date, time, parseInt(guests), 'pending', 'pending']
        );

        res.json({
            success: true,
            message: 'Reservation created successfully',
            reservation: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating reservation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create reservation',
            error: error.message
        });
    }
});

module.exports = router;