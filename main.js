require('dotenv').config();
const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');
const app = express();
const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';
const { sendEmail } = require('./utils/email');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const auth = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const SQLiteStore = require('connect-sqlite3')(session);
const bcrypt = require('bcrypt');
let db; // Global database connection

// Add startup logging
console.log('Application starting...');
console.log('Node environment:', process.env.NODE_ENV);

// Database setup
const isProduction = process.env.NODE_ENV === 'production';
const dbDir = isProduction
    ? path.join(process.env.HOME || '/tmp', '.rez_coq', 'db')
    : path.join(__dirname, 'dev_db');
const dbPath = process.env.DATABASE_PATH || path.join(dbDir, 'database.sqlite');

// Log the database path for debugging
console.log('Environment:', isProduction ? 'production' : 'development');
console.log('Database directory:', dbDir);
console.log('Database path:', dbPath);

// Ensure database directory exists
try {
    fs.mkdirSync(dbDir, { recursive: true, mode: 0o700 });
    
    // Initialize database
    db = new Database(dbPath);
    
    // Create tables
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
    
    db.prepare(`
        CREATE TABLE IF NOT EXISTS reservations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            guests INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            email_status TEXT DEFAULT 'pending',
            email_sent_at DATETIME,
            email_error TEXT
        )
    `).run();
    
    db.prepare(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    `).run();
    
    db.prepare(`
        INSERT OR IGNORE INTO settings (key, value) VALUES
        ('daily_max_guests', '100'),
        ('opening_time', '11:00'),
        ('closing_time', '22:00'),
        ('slot_duration', '30'),
        ('max_party_size', '12')
    `).run();
    
    // Create default admin if none exists
    async function createAdminIfNeeded() {
        const hasAdmin = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
        console.log('Checking for admin account:', {
            hasAdmin: !!hasAdmin,
            hasEnvVars: {
                email: !!process.env.ADMIN_EMAIL,
                password: !!process.env.ADMIN_PASSWORD
            }
        });
        
        if (!hasAdmin && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
            console.log('Creating default admin account...');
            const saltRounds = 10;
            try {
                const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, saltRounds);
                db.prepare(`
                    INSERT INTO users (username, password_hash, email, role, verified)
                    VALUES (?, ?, ?, 'admin', 1)
                `).run(
                    process.env.ADMIN_EMAIL,  // Use email as username
                    passwordHash,
                    process.env.ADMIN_EMAIL
                );
                console.log('Admin account created successfully');
            } catch (error) {
                console.error('Failed to create admin:', error);
            }
        }
    }
    
    // Call the async function
    createAdminIfNeeded().catch(console.error);
    
    // Middleware setup
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use(session({
        secret: process.env.SESSION_SECRET || 'your-secret-key',
        resave: false,
        saveUninitialized: false,
        name: 'rez_coq_session',
        store: new SQLiteStore({
            db: 'sessions.db',
            dir: dbDir,
            concurrentDB: true
        }),
        cookie: {
            secure: isProduction,
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: 'lax',
            path: '/'
        },
        proxy: true
    }));

    // Trust proxy - needed for secure cookies behind Render's proxy
    app.set('trust proxy', 1);

    // Auth routes must come before static files
    app.use('/api/auth', authRoutes(db));

    // Root route - must be first
    app.get('/', (req, res) => {
        // Let auth middleware handle the redirect
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // Add security headers
    app.use((req, res, next) => {
        res.set({
            'Strict-Transport-Security': 'max-age=31536000',
            'X-Frame-Options': 'DENY',
            'X-Content-Type-Options': 'nosniff'
        });
        next();
    });

    // Set proper MIME types for static files
    app.use(express.static(path.join(__dirname, 'public'), {
        setHeaders: (res, filePath) => {
            if (filePath.endsWith('.js')) {
                res.setHeader('Content-Type', 'application/javascript');
            } else if (filePath.endsWith('.css')) {
                res.setHeader('Content-Type', 'text/css');
            }
        },
        fallthrough: true,
        index: false
    }));

    // Login and Register routes (no auth required)
    app.get('/login', (req, res) => {
        if (req.session?.user) {
            return res.redirect('/dashboard');
        }
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    });

    app.get('/register', (req, res) => {
        if (req.session?.user) {
            return res.redirect('/dashboard');
        }
        res.sendFile(path.join(__dirname, 'public', 'register.html'));
    });

    // Protected routes
    app.use(auth);  // Apply auth middleware to all routes below this

    // Route handlers
    app.get('/', (req, res) => {
        if (!req.session?.user) {
            return res.redirect('/login');
        }
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // API Routes
    app.post('/api/reservations', auth, async (req, res) => {
        const { date, time, guests, email, name } = req.body;
        try {
            // Check capacity
            const settingRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('daily_max_guests');
            const maxGuests = parseInt(settingRow.value);
            const totalRow = db.prepare('SELECT SUM(guests) as total FROM reservations WHERE date = ?').get(date);
            const currentTotal = totalRow.total || 0;

            if (currentTotal + parseInt(guests) > maxGuests) {
                return res.status(400).json({
                    success: false,
                    message: `Sorry, we don't have enough capacity for ${guests} guests on this date.`
                });
            }

            // Add reservation
            const result = db.prepare(`
                INSERT INTO reservations (date, time, guests, email, name, created_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
            `).run(date, time, guests, email, name);

            // Send confirmation email
            try {
                await sendEmail(email, 'confirmation', {
                    id: result.lastInsertRowid,
                    date, time, guests, name, email
                });
                db.prepare(`
                    UPDATE reservations 
                    SET email_status = 'sent',
                        email_sent_at = datetime('now')
                    WHERE id = ?
                `).run(result.lastInsertRowid);
            } catch (emailError) {
                console.error('Email error:', emailError);
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
            console.error('Reservation error:', err);
            res.status(500).json({
                success: false,
                message: 'Error saving reservation'
            });
        }
    });

    // Get all reservations
    app.get('/api/reservations', auth, (req, res) => {
        try {
            const rows = db.prepare('SELECT * FROM reservations ORDER BY date, time').all();
            res.json(rows);
        } catch (err) {
            res.status(500).json({ error: 'Error retrieving reservations' });
        }
    });

    // Get customer's reservations
    app.get('/api/reservations/my-reservations', auth, (req, res) => {
        try {
            const rows = db.prepare(`
                SELECT * FROM reservations 
                WHERE email = ?
                ORDER BY date, time
            `).all(req.session.user.username);
            res.json(rows);
        } catch (err) {
            console.error('Reservation fetch error:', err, {
                userId: req.session.user.id,
                userEmail: req.session.user.username
            });
            res.status(500).json({ error: 'Error retrieving reservations' });
        }
    });

    // Cancel reservation
    app.post('/api/reservations/:id/cancel', auth, async (req, res) => {
        const { id } = req.params;
        try {
            const reservation = db.prepare(`
                SELECT * FROM reservations 
                WHERE id = ? AND email = (SELECT email FROM users WHERE id = ?)
            `).get(id, req.session.user.id);
            
            if (!reservation) {
                return res.status(404).json({
                    success: false,
                    message: 'Reservation not found'
                });
            }
            
            db.prepare('DELETE FROM reservations WHERE id = ?').run(id);
            res.json({
                success: true,
                message: 'Reservation cancelled successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to cancel reservation'
            });
        }
    });

    // Get available times
    app.get('/api/available-times', auth, (req, res) => {
        const date = req.query.date;
        try {
            const settings = db.prepare('SELECT * FROM settings').all()
                .reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
            
            const openTime = settings.opening_time || '11:00';
            const closeTime = settings.closing_time || '22:00';
            const duration = parseInt(settings.slot_duration) || 30;
            
            // Generate time slots
            const slots = [];
            let currentTime = new Date(`2000-01-01 ${openTime}`);
            const endTime = new Date(`2000-01-01 ${closeTime}`);
            
            while (currentTime < endTime) {
                slots.push(currentTime.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                }));
                currentTime.setMinutes(currentTime.getMinutes() + duration);
            }
            
            res.json(slots);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Settings routes
    app.get('/api/settings', auth, (req, res) => {
        try {
            const rows = db.prepare('SELECT * FROM settings').all();
            res.json(rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/settings', auth, (req, res) => {
        try {
            // Verify admin role
            if (req.session.user.role !== 'admin') {
                return res.status(403).json({ error: 'Admin access required' });
            }

            console.log('Updating settings:', req.body);
            const updateStmt = db.prepare('UPDATE settings SET value = ? WHERE key = ?');
            Object.entries(req.body).forEach(([key, value]) => {
                updateStmt.run(value, key);
            });
            
            // Verify updates
            const updatedSettings = db.prepare('SELECT * FROM settings').all();
            console.log('Settings updated:', updatedSettings);

            res.json({ 
                success: true,
                message: 'Settings updated successfully',
                settings: updatedSettings
            });
        } catch (err) {
            console.error('Settings update error:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // Route handlers
    app.get('/dashboard', auth, (req, res) => {
        if (req.session.user.role !== 'admin') {
            return res.redirect('/customer-dashboard');
        }
        res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
    });

    app.get('/customer-dashboard', auth, (req, res) => {
        if (req.session.user.role !== 'customer') {
            return res.redirect('/dashboard');
        }
        res.sendFile(path.join(__dirname, 'public', 'customer-dashboard.html'));
    });

    // Add user settings route
    app.get('/user-settings', auth, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'user-settings.html'));
    });

    // Serve static files LAST
    app.use(express.static(path.join(__dirname, 'public')));

    // Database viewer (admin only)
    app.get('/api/admin/db-view', auth, async (req, res) => {
        if (req.session.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        try {
            const data = {
                users: db.prepare('SELECT id, username, email, role, created_at FROM users').all(),
                reservations: db.prepare('SELECT * FROM reservations ORDER BY date, time').all(),
                settings: db.prepare('SELECT * FROM settings').all()
            };
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Start server with proper configuration
    const server = app.listen(PORT, HOST, () => {
        console.log('\n=== Server Configuration ===');
        console.log(`Server: http://${HOST}:${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV}`);
        console.log(`Database: ${path.resolve(dbPath)}`);
        console.log(`Static Files: ${path.resolve(__dirname, 'public')}`);
        console.log('=========================\n');
    }).on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            console.error(`Port ${PORT} is already in use. Please try another port or kill the existing process.`);
            process.exit(1);
        } else {
            console.error('Server error:', error);
        }
    });

    // Increase timeouts
    server.keepAliveTimeout = 120000;  // 120 seconds
    server.headersTimeout = 120000;    // 120 seconds

    // Add error handling
    server.on('error', (error) => {
        console.error('Server error:', error);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('SIGTERM received. Performing graceful shutdown...');
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });
    });

} catch (error) {
    console.error('Database initialization error:', error);
    process.exit(1);
}