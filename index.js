const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Create database directory in user's home directory
const userDataPath = app.isPackaged 
    ? path.join(process.env.HOME, '.rez_coq', 'db')
    : path.join(__dirname, 'db');

// Ensure directory exists
if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
}

const dbPath = path.join(userDataPath, 'database.sqlite');

// Database
const db = new Database(dbPath);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Add these routes before your API routes
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Add this function before your routes
function isDateWithinRollingWindow(date, rollingDays) {
    const today = new Date();
    const reservationDate = new Date(date);
    const diffTime = reservationDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= rollingDays;
}

// Routes
app.post('/api/reservation', async (req, res) => {
    const { date, time, guests, email, name } = req.body;
    
    try {
        // Get daily maximum from settings
        const maxGuests = await new Promise((resolve, reject) => {
            db.get('SELECT value FROM settings WHERE key = "daily_max_guests"', (err, row) => {
                if (err) reject(err);
                else resolve(parseInt(row.value));
            });
        });

        // Get current total for the date
        const currentTotal = await new Promise((resolve, reject) => {
            db.get('SELECT SUM(guests) as total FROM reservations WHERE date = ?', 
                [date], (err, row) => {
                    if (err) reject(err);
                    else resolve(row.total || 0);
                });
        });

        // Check if new reservation would exceed capacity
        if (currentTotal + parseInt(guests) > maxGuests) {
            return res.status(400).json({
                error: 'Capacity exceeded',
                message: 'Sorry, we don\'t have enough capacity for this date'
            });
        }

        // If capacity is available, proceed with reservation
        db.run(`INSERT INTO reservations (date, time, guests, email, name) 
                VALUES (?, ?, ?, ?, ?)`, 
            [date, time, guests, email, name], 
            function(err) {
                if (err) {
                    return res.status(500).json({
                        error: 'Database error',
                        message: 'Error saving reservation'
                    });
                }
                res.json({
                    message: 'Reservation confirmed',
                    id: this.lastID
                });
            });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/reservations', (req, res) => {
    db.all('SELECT * FROM reservations', [], (err, rows) => {
        if (err) {
            return res.status(500).send('Error retrieving reservations');
        }
        res.json(rows);
    });
});

// GET settings
app.get('/api/settings', (req, res) => {
    db.all('SELECT * FROM settings', [], (err, rows) => {
        if (err) {
            console.error('Error fetching settings:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log('Settings:', rows); // Debug log
        res.json(rows);
    });
});

// UPDATE settings
app.post('/api/settings', (req, res) => {
    const settings = req.body;
    console.log('Received settings update:', settings); // Debug log
    
    const updates = Object.entries(settings).map(([key, value]) => {
        return new Promise((resolve, reject) => {
            console.log(`Updating setting: ${key} = ${value}`); // Debug log
            db.run('UPDATE settings SET value = ? WHERE key = ?', [value, key], (err) => {
                if (err) {
                    console.error(`Error updating setting ${key}:`, err); // Debug log
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    });

    Promise.all(updates)
        .then(() => {
            console.log('All settings updated successfully'); // Debug log
            res.json({ message: 'Settings updated successfully' });
        })
        .catch(err => {
            console.error('Settings update failed:', err); // Debug log
            res.status(500).json({ error: err.message });
        });
});

// Add this new endpoint to check daily capacity
app.get('/api/capacity/:date', async (req, res) => {
    const date = req.params.date;
    
    try {
        // Get daily maximum from settings
        const maxGuests = await new Promise((resolve, reject) => {
            db.get('SELECT value FROM settings WHERE key = "daily_max_guests"', (err, row) => {
                if (err) reject(err);
                else resolve(parseInt(row.value));
            });
        });

        // Get total guests for the date
        const totalGuests = await new Promise((resolve, reject) => {
            db.get('SELECT SUM(guests) as total FROM reservations WHERE date = ?', 
                [date], (err, row) => {
                    if (err) reject(err);
                    else resolve(row.total || 0);
                });
        });

        res.json({
            maxGuests,
            currentTotal: totalGuests,
            remainingCapacity: maxGuests - totalGuests
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add this after your other routes
app.get('/api/available-times', (req, res) => {
    const date = req.query.date;
    console.log('Fetching times for date:', date); // Debug log
    
    // Get settings from database
    db.get('SELECT value FROM settings WHERE key = ?', ['opening_time'], (err, openRow) => {
        if (err) {
            console.error('Error fetching opening time:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('Opening time:', openRow); // Debug log
        
        db.get('SELECT value FROM settings WHERE key = ?', ['closing_time'], (err, closeRow) => {
            if (err) {
                console.error('Error fetching closing time:', err);
                return res.status(500).json({ error: err.message });
            }
            
            db.get('SELECT value FROM settings WHERE key = ?', ['slot_duration'], (err, durationRow) => {
                if (err) {
                    console.error('Error fetching slot duration:', err);
                    return res.status(500).json({ error: err.message });
                }

                const openTime = openRow ? openRow.value : '11:00';
                const closeTime = closeRow ? closeRow.value : '22:00';
                const duration = durationRow ? parseInt(durationRow.value) : 30;

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

                res.json(slots);
            });
        });
    });
});

// Add reservation endpoint
app.post('/api/reservations', (req, res) => {
    console.log('Received reservation:', req.body);
    
    const { date, time, guests, email, name } = req.body;
    
    // Prevent double submission by checking for existing reservation
    const checkStmt = db.prepare(`
        SELECT id FROM reservations 
        WHERE date = ? AND time = ? AND email = ? 
        AND created_at > datetime('now', '-1 minute')
    `);
    
    const existing = checkStmt.get([date, time, email]);
    if (existing) {
        return res.status(400).json({
            success: false,
            message: 'This reservation was just submitted. Please wait a moment before trying again.'
        });
    }
    
    // Add created_at timestamp to the reservation
    const stmt = db.prepare(`
        INSERT INTO reservations (date, time, guests, email, name, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);
    
    try {
        const info = stmt.run([date, time, guests, email, name]);
        res.json({
            success: true,
            message: 'Reservation confirmed',
            id: info.lastInsertRowid
        });
    } catch (err) {
        console.error('Error saving reservation:', err);
        res.status(500).json({
            success: false,
            message: 'Error saving reservation'
        });
    }
});

// Modified server start with error handling
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`Port ${PORT} is busy, trying ${PORT + 1}`)
        server.close()
        app.listen(PORT + 1)
    } else {
        console.error('Server error:', err)
    }
})

module.exports = app