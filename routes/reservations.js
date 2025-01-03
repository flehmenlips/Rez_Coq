const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const { getReservations, createReservation, getSettings } = require('../utils/db-queries');
const { sendEmail } = require('../utils/email');

const reservationRoutes = () => {
    // Get available time slots
    router.get('/available-times', async (req, res) => {
        try {
            const settings = await getSettings();
            console.log('Retrieved settings:', settings);
            
            const openTime = settings.opening_time;
            const closeTime = settings.closing_time;
            const duration = parseInt(settings.slot_duration);
            
            console.log('Using values:', { openTime, closeTime, duration });

            // Generate time slots
            const slots = await generateTimeSlots(openTime, closeTime, duration);
            console.log('Generated time slots:', slots);
            
            res.json(slots);
        } catch (error) {
            console.error('Error getting available times:', error);
            console.error('Error details:', error.stack);
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
            console.log('Fetching reservations for user:', userEmail);
            
            const result = await pool.query(
                `SELECT * FROM reservations 
                 WHERE email = $1 
                 ORDER BY date DESC, time DESC`,
                [userEmail]
            );
            
            console.log('Found reservations:', result.rows.length);
            res.json(result.rows);
            
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
            const { date, time, guests } = req.body;
            
            // Get settings for validation
            const settings = await getSettings();
            const maxPartySize = parseInt(settings.max_party_size);
            const dailyMaxGuests = parseInt(settings.daily_max_guests);
            
            // Validate party size
            if (parseInt(guests) > maxPartySize) {
                return res.status(400).json({
                    success: false,
                    message: `Party size cannot exceed ${maxPartySize} guests`
                });
            }
            
            // Get total guests for the day
            const existingReservations = await pool.query(
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
            const reservation = await createReservation(req.body);

            // Format date for email
            const formattedDate = new Date(date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            // Send confirmation email
            try {
                await sendEmail(req.body.email, 'confirmation', {
                    id: reservation.id,
                    name: req.body.name,
                    date: formattedDate,
                    time: time,
                    guests: guests
                });
                console.log('Confirmation email sent successfully');
            } catch (emailError) {
                console.error('Failed to send confirmation email:', emailError);
                // Don't fail the request if email fails
            }

            res.json({ success: true, reservation });
        } catch (error) {
            console.error('Error creating reservation:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to create reservation'
            });
        }
    });

    // Get daily guest count
    router.get('/daily-count', async (req, res) => {
        try {
            const { date } = req.query;
            if (!date) {
                return res.status(400).json({
                    success: false,
                    message: 'Date parameter is required'
                });
            }

            const result = await pool.query(
                'SELECT COALESCE(SUM(guests), 0) as total_guests FROM reservations WHERE date = $1',
                [date]
            );

            res.json({
                success: true,
                total_guests: parseInt(result.rows[0].total_guests)
            });
        } catch (error) {
            console.error('Error getting daily guest count:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get daily guest count'
            });
        }
    });

    // Cancel reservation
    router.post('/:id/cancel', async (req, res) => {
        try {
            const { id } = req.params;
            
            // Verify the reservation exists and belongs to the user
            const checkResult = await pool.query(
                'SELECT * FROM reservations WHERE id = $1 AND email = $2',
                [id, req.session.user.email]
            );
            
            if (checkResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Reservation not found or not authorized'
                });
            }
            
            // Delete the reservation
            await pool.query(
                'DELETE FROM reservations WHERE id = $1',
                [id]
            );
            
            // Send cancellation email
            try {
                const reservation = checkResult.rows[0];
                const formattedDate = new Date(reservation.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                
                await sendEmail(reservation.email, 'cancellation', {
                    name: reservation.name,
                    date: formattedDate,
                    time: reservation.time,
                    guests: reservation.guests
                });
                console.log('Cancellation email sent successfully');
            } catch (emailError) {
                console.error('Failed to send cancellation email:', emailError);
                // Don't fail the request if email fails
            }
            
            res.json({
                success: true,
                message: 'Reservation cancelled successfully'
            });
            
        } catch (error) {
            console.error('Error cancelling reservation:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to cancel reservation'
            });
        }
    });

    // Modify reservation
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { date, time, guests } = req.body;
            
            // Verify the reservation exists and belongs to the user
            const checkResult = await pool.query(
                'SELECT * FROM reservations WHERE id = $1 AND email = $2',
                [id, req.session.user.email]
            );
            
            if (checkResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Reservation not found or not authorized'
                });
            }
            
            // Get settings for validation
            const settings = await getSettings();
            const maxPartySize = parseInt(settings.max_party_size);
            const dailyMaxGuests = parseInt(settings.daily_max_guests);
            
            // Validate party size
            if (parseInt(guests) > maxPartySize) {
                return res.status(400).json({
                    success: false,
                    message: `Party size cannot exceed ${maxPartySize} guests`
                });
            }
            
            // Get total guests for the day (excluding this reservation)
            const existingReservations = await pool.query(
                'SELECT COALESCE(SUM(guests), 0) as total_guests FROM reservations WHERE date = $1 AND id != $2',
                [date, id]
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
            
            // Update the reservation
            const result = await pool.query(
                `UPDATE reservations 
                 SET date = $1, time = $2, guests = $3, email_status = 'pending'
                 WHERE id = $4
                 RETURNING *`,
                [date, time, guests, id]
            );
            
            const updatedReservation = result.rows[0];
            
            // Send modification confirmation email
            try {
                const formattedDate = new Date(date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                
                await sendEmail(updatedReservation.email, 'modification', {
                    name: updatedReservation.name,
                    date: formattedDate,
                    time: time,
                    guests: guests
                });
                console.log('Modification confirmation email sent successfully');
            } catch (emailError) {
                console.error('Failed to send modification email:', emailError);
                // Don't fail the request if email fails
            }
            
            res.json({
                success: true,
                message: 'Reservation modified successfully',
                reservation: updatedReservation
            });
            
        } catch (error) {
            console.error('Error modifying reservation:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to modify reservation'
            });
        }
    });

    return router;
};

// Helper function to generate time slots
function generateTimeSlots(openTime, closeTime, duration) {
    try {
        console.log('Generating slots with:', { openTime, closeTime, duration });
        
        // Ensure times are in HH:mm format
        if (!openTime.includes(':')) openTime += ':00';
        if (!closeTime.includes(':')) closeTime += ':00';
        
        // Parse times using a fixed date for comparison
        const baseDate = '2000-01-01 ';
        const openDateTime = new Date(baseDate + openTime);
        const closeDateTime = new Date(baseDate + closeTime);
        
        console.log('Parsed times:', {
            openDateTime: openDateTime.toLocaleTimeString(),
            closeDateTime: closeDateTime.toLocaleTimeString()
        });
        
        if (isNaN(openDateTime.getTime()) || isNaN(closeDateTime.getTime())) {
            throw new Error('Invalid time format');
        }
        
        const slots = [];
        let currentTime = new Date(openDateTime);
        
        while (currentTime <= new Date(closeDateTime.getTime() - duration * 60000)) {
            const timeSlot = currentTime.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
            console.log('Adding slot:', timeSlot);
            slots.push(timeSlot);
            currentTime.setMinutes(currentTime.getMinutes() + duration);
        }
        
        console.log('Generated slots:', slots);
        return slots;
    } catch (error) {
        console.error('Error in generateTimeSlots:', error);
        console.error('Stack:', error.stack);
        throw error;
    }
}

module.exports = reservationRoutes;