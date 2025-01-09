const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');
const app = express();
const PORT = process.env.PORT || 3000;
const { sendEmail } = require('./utils/email');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const auth = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
let db; // Global database connection

// At the top of the file, add a logging utility
const log = {
    info: (...args) => {
        const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');

        if (process.env.NODE_ENV !== 'production') {
            console.log(...args);
        }
        // Also log to file in production
        if (process.env.NODE_ENV === 'production') {
            const logDir = path.join(os.homedir(), '.rez_coq', 'logs');
            try {
                fs.mkdirSync(logDir, { recursive: true, mode: 0o700 });
                fs.appendFileSync(
                    path.join(logDir, 'app.log'),
                    `${new Date().toISOString()} [INFO]: ${message}\n`
                );
            } catch (e) {
                console.log('Logging error:', e);
            }
        }
    },
    error: (...args) => {
        const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');

        if (process.env.NODE_ENV === 'production') {
            const logDir = path.join(os.homedir(), '.rez_coq', 'logs');
            try {
                fs.mkdirSync(logDir, { recursive: true, mode: 0o700 });
                fs.appendFileSync(
                    path.join(logDir, 'error.log'),
                    `${new Date().toISOString()} [ERROR]: ${message}\n`
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
                        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'cancelled', 'completed')),
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        email_status TEXT DEFAULT 'pending',
                        email_sent_at DATETIME,
                        email_error TEXT,
                        cancelled_at DATETIME,
                        cancelled_by INTEGER,
                        FOREIGN KEY(cancelled_by) REFERENCES users(id)
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
                    ('slot_duration', '30'),
                    ('max_party_size', '12')
                `);
                initializeSettings.run();

                db.prepare(`
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT UNIQUE NOT NULL,
                        password_hash TEXT NOT NULL,
                        role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('admin', 'customer')),
                        email TEXT UNIQUE,
                        verified BOOLEAN DEFAULT 0,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        last_login DATETIME,
                        settings_json TEXT
                    )
                `).run();

                // Create default admin if none exists
                const hasAdmin = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
                if (!hasAdmin) {
                    const defaultAdmin = {
                        username: 'admin',
                        password_hash: 'CHANGE_ME_ON_FIRST_LOGIN',
                        role: 'admin',
                        email: 'admin@rezcoq.com',
                        verified: 1
                    };
                    
                    db.prepare(`
                        INSERT INTO users (username, password_hash, role, email, verified)
                        VALUES (?, ?, ?, ?, ?)
                    `).run(
                        defaultAdmin.username, 
                        defaultAdmin.password_hash, 
                        defaultAdmin.role,
                        defaultAdmin.email,
                        defaultAdmin.verified
                    );
                }

            } catch (tableError) {
                log.error('Error creating database tables:', tableError);
                if (db) db.close();
                throw new Error(`Failed to create database tables: ${tableError.message}`);
            }
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
            WHERE type='table'
        `).all();
        console.log('Database tables:', tables);

        // Verify users table
        const users = db.prepare('SELECT * FROM users').all();
        console.log('Users in database:', users.length);

        // Detailed database verification
        try {
            const adminUser = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
            console.log('Database verification:', {
                tables: tables.map(t => t.name),
                usersCount: users.length,
                adminExists: !!adminUser,
                adminDetails: adminUser ? {
                    id: adminUser.id,
                    username: adminUser.username,
                    hasDefaultPassword: adminUser.password_hash === 'CHANGE_ME_ON_FIRST_LOGIN'
                } : null
            });
        } catch (verifyError) {
            console.error('Database verification error:', verifyError);
        }

        // Continue with the rest of your application setup...
        // Middleware
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));
        app.use(cookieParser());
        app.use(session({
            secret: process.env.SESSION_SECRET || 'your-secret-key',
            resave: false,
            saveUninitialized: false,
            name: 'rez_coq_session',
            cookie: {
                secure: process.env.NODE_ENV === 'production',
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            },
            store: new session.MemoryStore()
        }));
        app.use(express.static(path.join(__dirname, 'public')));

        // Add these routes before your API routes
        app.get('/dashboard', (req, res) => {
            if (!req.session?.user) {
                return res.redirect('/login');
            }
            if (req.session.user.role !== 'admin') {
                return res.status(403).send('Access denied');
            }
            res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
        });

        // Add user settings route (protected by auth)
        app.get('/user-settings', (req, res) => {
            if (!req.session?.user) {
                return res.redirect('/login');
            }
            res.sendFile(path.join(__dirname, 'public', 'user-settings.html'));
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
        app.post('/api/reservations', async (req, res) => {
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
                    WHERE date = ? AND time = ? 
                    AND (email = ? OR email = (SELECT email FROM users WHERE id = ?))
                    AND status != 'cancelled'
                `);
                
                const existing = checkStmt.get(date, time, email, req.session?.user?.id);
                if (existing) {
                    log.info('Duplicate reservation detected:', {
                        existingId: existing.id,
                        date,
                        time,
                        email,
                        userId: req.session?.user?.id
                    });
                    return res.status(400).json({
                        success: false,
                        message: 'You already have a reservation for this date and time.'
                    });
                }
                
                // Add the reservation
                const insertStmt = db.prepare(`
                    INSERT INTO reservations (date, time, guests, email, name, status, created_at)
                    VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))
                `);
                
                const result = insertStmt.run(date, time, guests, email, name);
                log.info('Reservation saved:', result);
                
                try {
                    await sendEmail(email, 'confirmation', {
                        id: result.lastInsertRowid,
                        date,
                        time,
                        guests,
                        name,
                        email
                    });
                    
                    // Update email status
                    db.prepare(`
                        UPDATE reservations 
                        SET email_status = 'sent',
                            email_sent_at = datetime('now')
                        WHERE id = ?
                    `).run(result.lastInsertRowid);
                    
                } catch (emailError) {
                    log.error('Email sending failed:', emailError);
                    
                    // Update email status with error
                    db.prepare(`
                        UPDATE reservations 
                        SET email_status = 'failed',
                            email_error = ?
                        WHERE id = ?
                    `).run(emailError.message, result.lastInsertRowid);
                }
                
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

        // Add this near your other routes
        app.get('/api/test-email', async (req, res) => {
            try {
                log.info('Starting email test...');
                const { testEmailSetup } = require('./utils/email');
                log.info('Email configuration:', {
                    host: process.env.SMTP_HOST,
                    port: process.env.SMTP_PORT,
                    user: process.env.SMTP_USER,
                    // Don't log the password!
                });
                
                const result = await testEmailSetup();
                log.info('Email test result:', result);
                
                if (result) {
                    res.json({ success: true, message: 'Test email sent successfully' });
                } else {
                    res.status(500).json({ success: false, message: 'Test email failed' });
                }
            } catch (error) {
                log.error('Email test failed with error:', error);
                res.status(500).json({ 
                    success: false, 
                    message: 'Email test failed', 
                    error: error.message,
                    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
                });
            }
        });

        // Add this with your other routes
        app.post('/api/reservations/:id/retry-email', async (req, res) => {
            const { id } = req.params;
            
            try {
                // Get reservation details
                const reservation = db.prepare(`
                    SELECT * FROM reservations WHERE id = ?
                `).get(id);
                
                if (!reservation) {
                    return res.status(404).json({
                        success: false,
                        message: 'Reservation not found'
                    });
                }
                
                // Try to send email
                await sendEmail(reservation.email, 'confirmation', {
                    id: reservation.id,
                    date: reservation.date,
                    time: reservation.time,
                    guests: reservation.guests,
                    name: reservation.name,
                    email: reservation.email
                });
                
                // Update email status
                db.prepare(`
                    UPDATE reservations 
                    SET email_status = 'sent',
                        email_sent_at = datetime('now'),
                        email_error = NULL
                    WHERE id = ?
                `).run(id);
                
                res.json({
                    success: true,
                    message: 'Email sent successfully'
                });
                
            } catch (error) {
                log.error('Retry email failed:', error);
                
                // Update error status
                db.prepare(`
                    UPDATE reservations 
                    SET email_status = 'failed',
                        email_error = ?
                    WHERE id = ?
                `).run(error.message, id);
                
                res.status(500).json({
                    success: false,
                    message: 'Failed to send email',
                    error: error.message
                });
            }
        });

        // Add auth routes
        const authRouter = authRoutes(db);
        app.use('/api/auth', authRouter);

        // Protect dashboard routes
        app.use('/dashboard', auth);
        app.use('/api/settings', auth);

        // Add this with your other routes
        app.get('/login', (req, res) => {
            if (req.session?.user) {
                return res.redirect('/dashboard');
            }
            res.sendFile(path.join(__dirname, 'public', 'login.html'));
        });

        // Add register route
        app.get('/register', (req, res) => {
            if (req.session?.user) {
                return res.redirect('/dashboard');
            }
            res.sendFile(path.join(__dirname, 'public', 'register.html'));
        });

        // Add this with your other routes
        app.get('/api/reservations/my-reservations', auth, (req, res) => {
            try {
                const stmt = db.prepare(`
                    SELECT * FROM reservations 
                    WHERE email = (SELECT email FROM users WHERE id = ?)
                    ORDER BY date, time
                `);
                const rows = stmt.all(req.session.user.id);
                res.json(rows);
            } catch (err) {
                log.error('Error retrieving user reservations:', err);
                res.status(500).json({ error: 'Error retrieving reservations' });
            }
        });

        // Add this with your other routes
        app.get('/customer-dashboard', (req, res) => {
            if (!req.session?.user) {
                return res.redirect('/login');
            }
            if (req.session.user.role !== 'customer') {
                return res.status(403).send('Access denied');
            }
            res.sendFile(path.join(__dirname, 'public', 'customer-dashboard.html'));
        });

        // Update cancel reservation endpoint
        app.post('/api/reservations/:id/cancel', auth, async (req, res) => {
            const { id } = req.params;
            
            try {
                // Verify the reservation belongs to this user
                const reservation = db.prepare(`
                    SELECT r.* 
                    FROM reservations r
                    LEFT JOIN users u ON r.email = u.email
                    WHERE r.id = ? AND (u.id = ? OR r.email = ?)
                `).get(id, req.session.user.id, req.session.user.email);
                
                if (!reservation) {
                    log.error('Reservation not found or unauthorized:', {
                        reservationId: id,
                        userId: req.session.user.id,
                        userEmail: req.session.user.email
                    });
                    return res.status(404).json({
                        success: false,
                        message: 'Reservation not found or you are not authorized to cancel it'
                    });
                }
                
                // Update the reservation status instead of deleting
                db.prepare(`
                    UPDATE reservations 
                    SET status = 'cancelled',
                        cancelled_at = datetime('now'),
                        cancelled_by = ?
                    WHERE id = ?
                `).run(req.session.user.id, id);
                
                // Send cancellation confirmation email
                try {
                    await sendEmail(reservation.email, 'cancellation', {
                        id: reservation.id,
                        date: reservation.date,
                        time: reservation.time,
                        guests: reservation.guests,
                        name: reservation.name,
                        email: reservation.email
                    });
                    log.info('Cancellation email sent:', {
                        reservationId: id,
                        email: reservation.email
                    });
                } catch (emailError) {
                    log.error('Error sending cancellation email:', {
                        error: emailError,
                        reservationId: id,
                        email: reservation.email
                    });
                }
                
                res.json({
                    success: true,
                    message: 'Reservation cancelled successfully'
                });
                
            } catch (error) {
                log.error('Error canceling reservation:', {
                    error,
                    reservationId: id,
                    userId: req.session.user.id
                });
                res.status(500).json({
                    success: false,
                    message: 'Failed to cancel reservation'
                });
            }
        });

        // Import database modules
        const { pool, testConnection } = require('./utils/db');
        const { initializeDatabase } = require('./utils/db-queries');

        // Initialize database before starting the server
        async function startServer() {
            try {
                // Test database connection
                const isConnected = await testConnection();
                if (!isConnected) {
                    throw new Error('Could not connect to database');
                }

                // Initialize database
                await initializeDatabase();
                
                // Start server
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

                // Cleanup on exit
                process.on('SIGINT', async () => {
                    try {
                        await pool.end();
                        log.info('Database pool has ended');
                        process.exit(0);
                    } catch (err) {
                        log.error('Error during cleanup:', err);
                        process.exit(1);
                    }
                });

            } catch (error) {
                log.error('Failed to start server:', error);
                process.exit(1);
            }
        }

        // Start the server
        startServer();

        // Apply auth middleware to all routes
        app.use(auth.auth);

        // Routes
        app.use('/api/auth', authRoutes);
        app.use('/api/reservations', reservationRoutes);
        app.use('/api/settings', settingsRoutes);
        app.use('/api/admin', adminRoutes());  // Note the () to invoke the function

        // Add error handling middleware
        app.use((err, req, res, next) => {
            console.error('Global error handler:', err);
            res.status(err.status || 500).json({
                success: false,
                message: err.message || 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? err.stack : undefined
            });
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

app.post('/api/time-slots/availability', (req, res) => {
    const { date, time, guests } = req.body;
    
    try {
        // Get settings
        const settings = db.prepare('SELECT * FROM settings').all()
            .reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
        
        // Get total reservations for this time slot
        const existingReservations = db.prepare(`
            SELECT SUM(guests) as total
            FROM reservations 
            WHERE date = ? AND time = ?
        `).get(date, time);
        
        const totalGuests = existingReservations?.total || 0;
        const maxGuests = parseInt(settings.daily_max_guests);
        const remainingCapacity = maxGuests - totalGuests;
        
        res.json({
            isAvailable: remainingCapacity >= parseInt(guests),
            remainingCapacity,
            message: remainingCapacity < parseInt(guests) 
                ? `Sorry, only ${remainingCapacity} spots available at this time`
                : 'Time slot available'
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Error checking availability',
            message: error.message 
        });
    }
});