const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

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
            ['time_slot_interval', '30', 'Reservation time slot interval (minutes)']
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

// Routes
app.post('/api/reservation', (req, res) => {
    const { date, time, guests, email, name } = req.body;
    if (!date || !time || !guests || !email || !name) {
        return res.status(400).send('Missing required fields');
    }

    db.run(`INSERT INTO reservations (date, time, guests, email, name) VALUES (?, ?, ?, ?, ?)`, 
        [date, time, guests, email, name], function(err) {
        if (err) {
            return res.status(500).send('Error saving reservation');
        }
        res.send(`Reservation added with ID: ${this.lastID}`);
    });
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

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));