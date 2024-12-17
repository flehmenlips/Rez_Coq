const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

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

// Database
const db = new sqlite3.Database('./db/database.sqlite');
db.serialize(() => {
    db.run('CREATE TABLE IF NOT EXISTS reservations (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, time TEXT, guests INTEGER, email TEXT, name TEXT)');
});

// Add settings table initialization
db.serialize(() => {
    // First create the table
    db.run(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            description TEXT
        )
    `, (err) => {
        if (err) {
            console.error('Error creating settings table:', err);
            return;
        }
        
        // Then insert default settings
        const defaultSettings = [
            ['opening_hours', '09:00-22:00', 'Restaurant operating hours'],
            ['max_party_size', '10', 'Maximum party size allowed'],
            ['time_slot_interval', '30', 'Reservation time slot interval (minutes)'],
            ['opening_time', '11:00', 'Restaurant opening time'],
            ['closing_time', '22:00', 'Restaurant closing time'],
            ['slot_duration', '30', 'Time slot duration in minutes'],
            ['daily_max_guests', '100', 'Maximum number of guests allowed per day']
        ];
        
        const stmt = db.prepare('INSERT OR IGNORE INTO settings (key, value, description) VALUES (?, ?, ?)');
        defaultSettings.forEach(setting => {
            stmt.run(setting, (err) => {
                if (err) console.error('Error inserting setting:', err);
            });
        });
        stmt.finalize();
    });
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
    db.all('SELECT key, value FROM settings', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        const settings = {};
        rows.forEach(row => settings[row.key] = row.value);
        res.json(settings);
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

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));