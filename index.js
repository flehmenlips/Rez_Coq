const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');
const app = express();
const PORT = process.env.PORT || 3000;

// At the top of the file, add a logging utility
const log = {
    info: (...args) => {
        if (process.env.NODE_ENV !== 'production') {
            console.log(...args);
        }
        // Also log to file in production
        if (process.env.NODE_ENV === 'production') {
            const logDir = path.join(os.homedir(), '.rez_coq', 'logs');
            try {
                fs.mkdirSync(logDir, { recursive: true, mode: 0o700 });
                fs.appendFileSync(
                    path.join(logDir, 'app.log'), // Changed from error.log
                    `${new Date().toISOString()} [INFO]: ${args.join(' ')}\n`
                );
            } catch (e) {
                // If we can't write logs, log to console as fallback
                console.log('Logging error:', e);
            }
        }
    },
    error: (...args) => {
        // For errors, always write to file in production
        if (process.env.NODE_ENV === 'production') {
            const logDir = path.join(os.homedir(), '.rez_coq', 'logs');
            try {
                fs.mkdirSync(logDir, { recursive: true, mode: 0o700 });
                fs.appendFileSync(
                    path.join(logDir, 'error.log'),
                    `${new Date().toISOString()} [ERROR]: ${args.join(' ')}\n`
                );
            } catch (e) {
                console.error('Logging error:', e);
            }
        } else {
            console.error(...args);
        }
    }
};

// Add startup logging
log.info('Application starting...');
log.info('Node environment:', process.env.NODE_ENV);
log.info('App packaged:', app.isPackaged ? 'yes' : 'no');

// Database setup
const isProduction = app.isPackaged || process.env.NODE_ENV === 'production';
const dbDir = isProduction
    ? path.join(os.homedir(), '.rez_coq', 'db')
    : path.join(__dirname, 'dev_db');
const dbPath = path.join(dbDir, 'database.sqlite');

// Log the database path for debugging
log.info('Environment:', isProduction ? 'production' : 'development');
log.info('Database directory:', dbDir);
log.info('Database path:', dbPath);

// Ensure database directory exists
try {
    // Only try to create dev_db if we're in development
    if (!isProduction) {
        fs.mkdirSync(path.join(__dirname, 'dev_db'), { 
            recursive: true, 
            mode: 0o700
        });
    }

    // Always create the production directory structure
    fs.mkdirSync(path.join(os.homedir(), '.rez_coq', 'db'), { 
        recursive: true, 
        mode: 0o700
    });

    let db;
    // If database doesn't exist, create it
    if (!fs.existsSync(dbPath)) {
        log.info('Creating new database at:', dbPath);
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
                log.error('Error creating database tables:', tableError);
                if (db) db.close();
                throw new Error(`Failed to create database tables: ${tableError.message}`);
            }
            
            db.close();
        } catch (dbError) {
            log.error('Error creating database:', dbError);
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
        app.post('/api/reservations', (req, res) => {
            log.info('Received reservation:', req.body);
            
            const { date, time, guests, email, name } = req.body;
            
            try {
                // Check capacity first
                const settingRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('daily_max_guests');
                const maxGuests = parseInt(settingRow.value);

                const totalRow = db.prepare('SELECT SUM(guests) as total FROM reservations WHERE date = ?').get(date);
                const currentTotal = totalRow.total || 0;

                // Check if new reservation would exceed capacity
                if (currentTotal + parseInt(guests) > maxGuests) {
                    return res.status(400).json({
                        success: false,
                        message: `Sorry, we don't have enough capacity for ${guests} guests on this date. Remaining capacity: ${maxGuests - currentTotal}`
                    });
                }

                // Check for existing reservation
                const checkStmt = db.prepare(`
                    SELECT id FROM reservations 
                    WHERE date = ? AND time = ? AND email = ? 
                    AND created_at > datetime('now', '-1 minute')
                `);
                
                const existing = checkStmt.get(date, time, email);
                if (existing) {
                    log.info('Duplicate reservation detected:', existing);
                    return res.status(400).json({
                        success: false,
                        message: 'This reservation was just submitted. Please wait a moment before trying again.'
                    });
                }
                
                // Add the reservation
                const insertStmt = db.prepare(`
                    INSERT INTO reservations (date, time, guests, email, name, created_at)
                    VALUES (?, ?, ?, ?, ?, datetime('now'))
                `);
                
                const result = insertStmt.run(date, time, guests, email, name);
                log.info('Reservation saved:', result);
                
                res.json({
                    success: true,
                    message: 'Reservation confirmed',
                    id: result.lastInsertRowid
                });
            } catch (err) {
                log.error('Error saving reservation:', err);
                res.status(500).json({
                    success: false,
                    message: 'Error saving reservation'
                });
            }
        });

        app.get('/api/reservations', (req, res) => {
            try {
                const stmt = db.prepare('SELECT * FROM reservations ORDER BY date, time');
                const rows = stmt.all();
                res.json(rows);
            } catch (err) {
                log.error('Error retrieving reservations:', err);
                res.status(500).json({ error: 'Error retrieving reservations' });
            }
        });

        // GET settings
        app.get('/api/settings', (req, res) => {
            try {
                const stmt = db.prepare('SELECT * FROM settings');
                const rows = stmt.all();
                log.info('Settings:', rows); // Debug log
                res.json(rows);
            } catch (err) {
                log.error('Error fetching settings:', err);
                res.status(500).json({ error: err.message });
            }
        });

        // UPDATE settings
        app.post('/api/settings', (req, res) => {
            const settings = req.body;
            log.info('Received settings update:', settings);
            
            try {
                const updateStmt = db.prepare('UPDATE settings SET value = ? WHERE key = ?');
                
                const updates = Object.entries(settings).map(([key, value]) => {
                    log.info(`Updating setting: ${key} = ${value}`);
                    return updateStmt.run(value, key);
                });
                
                log.info('All settings updated successfully');
                res.json({ message: 'Settings updated successfully' });
            } catch (err) {
                log.error('Settings update failed:', err);
                res.status(500).json({ error: err.message });
            }
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
            log.info('Fetching times for date:', date);
            
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
                log.error('Error generating available times:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // Modified server start with better error handling
        const server = app.listen(PORT, () => {
            log.info(`Server is running on port ${PORT}`);
        }).on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                log.info(`Port ${PORT} is busy, trying ${PORT + 1}`);
                server.close();
                app.listen(PORT + 1);
            } else {
                log.error('Server error:', err);
            }
        });

        module.exports = app
    } catch (dbError) {
        log.error('Error opening database:', dbError);
        if (db) db.close();
        throw new Error(`Failed to open database: ${dbError.message}`);
    }

} catch (err) {
    log.error('Critical database initialization error:', err);
    // Attempt to start the application in a degraded mode or exit gracefully
    if (process.env.NODE_ENV === 'production') {
        log.error('Exiting application due to critical database error');
        process.exit(1);
    } else {
        // In development, throw the error for better debugging
        throw err;
    }
}