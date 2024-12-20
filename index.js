const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');
const app = express();
const PORT = process.env.PORT || 3000;

// Database setup
const dbDir = app.isPackaged 
    ? path.join(os.homedir(), '.rez_coq')
    : path.join(__dirname, 'dev_db');
const dbPath = path.join(dbDir, 'database.sqlite');

// Ensure database directory exists
try {
    // Create directory with restrictive permissions (0o700 = rwx------)
    fs.mkdirSync(dbDir, { 
        recursive: true, 
        mode: 0o700
    });
    
    // Ensure directory permissions are correct even if it already existed
    fs.chmodSync(dbDir, 0o700);
    
    let db;
    // If database doesn't exist, create it
    if (!fs.existsSync(dbPath)) {
        console.log('Creating new database at:', dbPath);
        try {
            db = new Database(dbPath);
            
            // Set restrictive permissions on the database file
            fs.chmodSync(dbPath, 0o600); // rw-------
            
            // Create tables with proper error handling
            try {
                db.prepare(`
                    CREATE TABLE IF NOT EXISTS reservations (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        email TEXT NOT NULL,
                        phone TEXT,
                        date TEXT NOT NULL,
                        time TEXT NOT NULL,
                        guests INTEGER NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `).run();

                // Create settings table if it doesn't exist
                db.prepare(`
                    CREATE TABLE IF NOT EXISTS settings (
                        key TEXT PRIMARY KEY,
                        value TEXT NOT NULL
                    )
                `).run();

                // Initialize default settings if needed
                const initializeSettings = db.prepare(`
                    INSERT OR IGNORE INTO settings (key, value) VALUES
                    ('daily_max_guests', '100'),
                    ('opening_time', '11:00'),
                    ('closing_time', '22:00'),
                    ('slot_duration', '30')
                `);
                initializeSettings.run();

            } catch (tableError) {
                console.error('Error creating database tables:', tableError);
                if (db) db.close();
                throw new Error(`Failed to create database tables: ${tableError.message}`);
            }
            
            db.close();
        } catch (dbError) {
            console.error('Error creating database:', dbError);
            throw new Error(`Failed to create database: ${dbError.message}`);
        }
    }
    
    // Open database for use with proper error handling
    try {
        db = new Database(dbPath);
        
        // Verify database connection and structure
        const tables = db.prepare(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND (name='reservations' OR name='settings')
        `).all();
        
        if (tables.length !== 2) {
            throw new Error('Database structure verification failed');
        }

        // Continue with the rest of your application setup...
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
                // Get daily maximum from settings - using synchronous get()
                const settingRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('daily_max_guests');
                const maxGuests = parseInt(settingRow.value);

                // Get current total for the date - using synchronous get()
                const totalRow = db.prepare('SELECT SUM(guests) as total FROM reservations WHERE date = ?').get(date);
                const currentTotal = totalRow.total || 0;

                // Check if new reservation would exceed capacity
                if (currentTotal + parseInt(guests) > maxGuests) {
                    return res.status(400).json({
                        error: 'Capacity exceeded',
                        message: 'Sorry, we don\'t have enough capacity for this date'
                    });
                }

                // If capacity is available, proceed with reservation
                const stmt = db.prepare(`INSERT INTO reservations (date, time, guests, email, name) 
                        VALUES (?, ?, ?, ?, ?)`);
                const result = stmt.run(date, time, guests, email, name);
                
                res.json({
                    message: 'Reservation confirmed',
                    id: result.lastInsertRowid
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
        app.get('/api/capacity/:date', (req, res) => {
            const date = req.params.date;
            
            try {
                // Get daily maximum from settings - using synchronous get()
                const settingRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('daily_max_guests');
                const maxGuests = parseInt(settingRow.value);

                // Get total guests for the date - using synchronous get()
                const totalRow = db.prepare('SELECT SUM(guests) as total FROM reservations WHERE date = ?').get(date);
                const totalGuests = totalRow.total || 0;

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
            console.log('Fetching times for date:', date);
            
            try {
                // Get all settings at once using synchronous get()
                const openRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('opening_time');
                const closeRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('closing_time');
                const durationRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('slot_duration');

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
            } catch (error) {
                console.error('Error generating available times:', error);
                res.status(500).json({ error: error.message });
            }
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
    } catch (dbError) {
        console.error('Error opening database:', dbError);
        if (db) db.close();
        throw new Error(`Failed to open database: ${dbError.message}`);
    }

} catch (err) {
    console.error('Critical database initialization error:', err);
    // Attempt to start the application in a degraded mode or exit gracefully
    if (process.env.NODE_ENV === 'production') {
        console.error('Exiting application due to critical database error');
        process.exit(1);
    } else {
        // In development, throw the error for better debugging
        throw err;
    }
}