const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Import Reservation model
const Reservation = require('./models/Reservation');
const Settings = require('./models/Settings');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Add this middleware to log all requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`, req.body);
    next();
});

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/restaurant_db', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Add this near the top of server.js, after your imports
process.on('SIGTERM', () => {
    console.info('SIGTERM signal received.');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.info('SIGINT signal received.');
    process.exit(0);
});

// GET all reservations
app.get('/api/reservations', async (req, res) => {
    try {
        const reservations = await Reservation.find();
        console.log('Fetched reservations:', reservations);
        res.json(reservations);
    } catch (error) {
        console.error('Error fetching reservations:', error);
        res.status(500).json({ error: 'Failed to fetch reservations' });
    }
});

// POST new reservation
app.post('/api/reservations', async (req, res) => {
    try {
        // Log the raw request body
        console.log('Raw request body:', req.body);
        
        // Map the form data to match our schema
        const reservationData = {
            name: req.body.name,
            email: req.body.email,
            partySize: req.body.partySize,
            date: new Date(req.body.date),
            time: req.body.time,
            status: 'pending'
        };

        // Validate required fields
        if (!reservationData.name || !reservationData.email || 
            !reservationData.partySize || !reservationData.date || 
            !reservationData.time) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                received: reservationData 
            });
        }

        // Create and save reservation
        const reservation = new Reservation(reservationData);
        const savedReservation = await reservation.save();
        console.log('Successfully saved reservation:', savedReservation);
        
        res.status(201).json(savedReservation);
    } catch (error) {
        console.error('Error creating reservation:', {
            message: error.message,
            stack: error.stack,
            data: req.body
        });
        
        res.status(500).json({ 
            error: 'Failed to create reservation',
            details: error.message 
        });
    }
});

// Test route
app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is running' });
});

// GET settings
app.get('/api/settings', async (req, res) => {
    try {
        let settings = await Settings.findOne();
        
        // If no settings exist, create default settings
        if (!settings) {
            settings = await Settings.create({
                operating_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                opening_time: '11:00',
                closing_time: '22:00',
                slot_duration: 30,
                daily_max_guests: 100,
                rolling_days: 30,
                min_party_size: 1,
                max_party_size: 10
            });
        }
        
        console.log('Sending settings:', settings);
        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// PUT update settings
app.put('/api/settings', async (req, res) => {
    try {
        console.log('Received PUT request to /api/settings');
        console.log('Request body:', req.body);
        
        let settings = await Settings.findOne();
        if (!settings) {
            console.log('No existing settings found, creating new settings');
            settings = new Settings();
        }
        
        // Update settings
        Object.keys(req.body).forEach(key => {
            if (settings.schema.paths[key]) {
                console.log(`Updating ${key}:`, req.body[key]);
                settings[key] = req.body[key];
            }
        });
        
        const savedSettings = await settings.save();
        console.log('Settings saved successfully:', savedSettings);
        
        res.json(savedSettings);
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ 
            error: 'Failed to update settings',
            details: error.message 
        });
    }
});

// Add this with your other routes
app.get('/api/capacity/:date', async (req, res) => {
    try {
        const date = new Date(req.params.date);
        if (isNaN(date.getTime())) {
            return res.status(400).json({ message: 'Invalid date format' });
        }

        // Get reservations for this date
        const reservations = await Reservation.find({
            date: {
                $gte: new Date(date.setHours(0,0,0)),
                $lt: new Date(date.setHours(23,59,59))
            }
        });

        // Calculate total guests for the day
        const currentTotal = reservations.reduce((sum, res) => sum + res.partySize, 0);
        const maxGuests = 100; // You can make this configurable later

        res.json({
            date: req.params.date,
            maxGuests,
            currentTotal,
            remainingCapacity: maxGuests - currentTotal
        });
    } catch (error) {
        console.error('Error checking capacity:', error);
        res.status(500).json({ message: 'Error checking capacity' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 