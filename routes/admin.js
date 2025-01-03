const express = require('express');
const router = express.Router();
const pool = require('../utils/db');

const adminRoutes = () => {
    // Get users (admin only)
    router.get('/users', async (req, res) => {
        const client = await pool.connect();
        try {
            // Check if user is admin
            if (req.session?.user?.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Admin access required'
                });
            }

            const result = await client.query(
                'SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC'
            );

            res.json({
                success: true,
                users: result.rows
            });
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch users',
                error: error.message
            });
        } finally {
            client.release();
        }
    });

    // Get single reservation
    router.get('/reservations/:id', async (req, res) => {
        const client = await pool.connect();
        try {
            // Check if user is admin
            if (req.session?.user?.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Admin access required'
                });
            }

            const { id } = req.params;
            const result = await client.query(
                'SELECT * FROM reservations WHERE id = $1',
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Reservation not found'
                });
            }

            // Format time to HH:mm format
            const reservation = result.rows[0];
            if (reservation.time) {
                reservation.time = reservation.time.substring(0, 5); // Extract HH:mm from time string
            }

            res.json(reservation);
        } catch (error) {
            console.error('Error fetching reservation:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch reservation',
                error: error.message
            });
        } finally {
            client.release();
        }
    });

    // Update reservation
    router.put('/reservations/:id', async (req, res) => {
        const client = await pool.connect();
        try {
            // Check if user is admin
            if (req.session?.user?.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Admin access required'
                });
            }

            const { id } = req.params;
            const { date, time, name, email, guests, status } = req.body;

            console.log('Update request:', { id, date, time, name, email, guests, status });

            // Validate required fields
            if (!date || !time || !name || !email || !guests || !status) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
            }

            await client.query('BEGIN');

            // First check if reservation exists
            const checkResult = await client.query(
                'SELECT id FROM reservations WHERE id = $1',
                [id]
            );

            if (checkResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({
                    success: false,
                    message: 'Reservation not found'
                });
            }

            // Get settings for validation
            const settingsResult = await client.query('SELECT * FROM settings');
            const settings = {};
            settingsResult.rows.forEach(row => {
                settings[row.key] = row.value;
            });

            const maxPartySize = parseInt(settings.max_party_size);
            const dailyMaxGuests = parseInt(settings.daily_max_guests);

            // Validate party size
            if (parseInt(guests) > maxPartySize) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: `Party size cannot exceed ${maxPartySize} guests`
                });
            }

            // Get total guests for the day (excluding this reservation)
            const existingReservations = await client.query(
                'SELECT COALESCE(SUM(guests), 0) as total_guests FROM reservations WHERE date = $1 AND id != $2',
                [date, id]
            );

            const currentTotal = parseInt(existingReservations.rows[0].total_guests);
            const newTotal = currentTotal + parseInt(guests);

            // Validate against daily maximum
            if (newTotal > dailyMaxGuests) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: `Cannot exceed ${dailyMaxGuests} total guests per day. Currently ${currentTotal} guests reserved.`
                });
            }

            // Format time to ensure it's in HH:mm format
            const formattedTime = time.substring(0, 5);

            // Update the reservation
            const result = await client.query(
                `UPDATE reservations 
                 SET date = $1, time = $2, name = $3, email = $4, guests = $5, status = $6,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $7
                 RETURNING *`,
                [date, formattedTime, name, email, parseInt(guests), status, id]
            );

            await client.query('COMMIT');

            // Format time in response
            const updatedReservation = result.rows[0];
            if (updatedReservation.time) {
                updatedReservation.time = updatedReservation.time.substring(0, 5);
            }

            res.json({
                success: true,
                message: 'Reservation updated successfully',
                reservation: updatedReservation
            });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error updating reservation:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update reservation',
                error: error.message
            });
        } finally {
            client.release();
        }
    });

    // Delete reservation
    router.delete('/reservations/:id', async (req, res) => {
        const client = await pool.connect();
        try {
            // Check if user is admin
            if (req.session?.user?.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Admin access required'
                });
            }

            const { id } = req.params;

            await client.query('BEGIN');

            // First check if reservation exists
            const checkResult = await client.query(
                'SELECT id FROM reservations WHERE id = $1',
                [id]
            );

            if (checkResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({
                    success: false,
                    message: 'Reservation not found'
                });
            }

            // Delete the reservation
            await client.query(
                'DELETE FROM reservations WHERE id = $1',
                [id]
            );

            await client.query('COMMIT');

            res.json({
                success: true,
                message: 'Reservation deleted successfully'
            });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error deleting reservation:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete reservation',
                error: error.message
            });
        } finally {
            client.release();
        }
    });

    return router;
};

module.exports = adminRoutes; 