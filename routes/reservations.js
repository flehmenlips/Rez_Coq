const express = require('express');
const router = express.Router();
const { getReservations, createReservation, getSettings } = require('../utils/db-queries');

const reservationRoutes = () => {
    // Get available time slots
    router.get('/available-times', async (req, res) => {
        try {
            const settings = await getSettings();
            const openTime = settings.opening_time;
            const closeTime = settings.closing_time;
            const duration = parseInt(settings.slot_duration);

            // Generate time slots
            const slots = await generateTimeSlots(openTime, closeTime, duration);
            res.json(slots);
        } catch (error) {
            console.error('Error getting available times:', error);
            res.status(500).json({ success: false, message: 'Failed to get available times' });
        }
    });

    // Get all reservations
    router.get('/', async (req, res) => {
        try {
            const reservations = await getReservations();
            res.json(reservations || []);
        } catch (error) {
            console.error('Error fetching reservations:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch reservations' });
        }
    });

    // Get user's reservations
    router.get('/my-reservations', async (req, res) => {
        try {
            if (!req.session?.user?.email) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'User email not found in session' 
                });
            }
            
            const userEmail = req.session.user.email;
            const reservations = await getReservations(userEmail);
            res.json(reservations || []);
        } catch (error) {
            console.error('Error fetching user reservations:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch your reservations' 
            });
        }
    });

    // Create new reservation
    router.post('/', async (req, res) => {
        try {
            const reservation = await createReservation(req.body);
            res.json({ success: true, reservation });
        } catch (error) {
            console.error('Error creating reservation:', error);
            res.status(500).json({ success: false, message: 'Failed to create reservation' });
        }
    });

    return router;
};

// Helper function to generate time slots
function generateTimeSlots(openTime, closeTime, duration) {
    try {
        // Parse times using a fixed date for comparison
        const baseDate = '2000-01-01 ';
        const openDateTime = new Date(baseDate + openTime);
        const closeDateTime = new Date(baseDate + closeTime);
        const slots = [];
        
        // Start at opening time
        let currentTime = new Date(openDateTime);
        
        // Generate slots until closing time
        // Subtract duration to ensure last booking ends by closing time
        while (currentTime <= new Date(closeDateTime.getTime() - duration * 60000)) {
            slots.push(currentTime.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            }));
            currentTime.setMinutes(currentTime.getMinutes() + parseInt(duration));
        }
        
        return slots;
    } catch (error) {
        console.error('Error generating time slots:', error);
        throw error;
    }
}

module.exports = reservationRoutes;