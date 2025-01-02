const express = require('express');
const router = express.Router();
const { getReservations, createReservation } = require('../utils/db-queries');

const reservationRoutes = () => {
    // Get all reservations
    router.get('/', async (req, res) => {
        try {
            const reservations = await getReservations();
            res.json({ success: true, reservations });
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
            res.json(reservations);
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

module.exports = reservationRoutes;