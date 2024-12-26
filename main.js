require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';
const { sendEmail } = require('./utils/email');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const auth = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const reservationRoutes = require('./routes/reservations');
const settingsRoutes = require('./routes/settings');
const ConnectPgSimple = require('connect-pg-simple')(session);
const bcrypt = require('bcrypt');

// Initialize PostgreSQL connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Add connection error handling
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Database connection failed:', err);
        process.exit(-1);
    }
    console.log('Database connected successfully');
});

// Add startup logging
console.log('Application starting...');
console.log('Node environment:', process.env.NODE_ENV);
console.log('Database URL:', process.env.DATABASE_URL ? 'Set' : 'Missing');

// Initialize database
async function initializeDatabase() {
    try {
        // Check if database needs initialization
        const result = await pool.query('SELECT COUNT(*) as count FROM settings');
        const needsInit = result.rows[0].count === 0;
        
        if (needsInit) {
            console.log('Initializing new database...');
            await setupDatabase();
        }
        
        // Create default admin if needed
        await createAdminIfNeeded();
        
    } catch (error) {
        console.error('Database initialization error:', error);
        process.exit(1);
    }
}

// Database setup function
async function setupDatabase() {
    try {
        // Create tables
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role VARCHAR(50) NOT NULL DEFAULT 'customer',
                email VARCHAR(255) UNIQUE,
                verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS reservations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                phone VARCHAR(50),
                date DATE NOT NULL,
                time TIME NOT NULL,
                guests INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                email_status VARCHAR(50) DEFAULT 'pending',
                email_sent_at TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS settings (
                key VARCHAR(255) PRIMARY KEY,
                value TEXT NOT NULL
            );
        `);
        console.log('Database tables created successfully');
    } catch (error) {
        console.error('Error setting up database:', error);
        throw error;
    }
}

// Start initialization
initializeDatabase().catch(console.error);

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cookieParser());

// Session configuration
app.use(session({
    store: new ConnectPgSimple({
        pool: pool,
        tableName: 'session'
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Auth middleware
app.use(auth);

// Routes
app.use('/api/auth', authRoutes(pool));
app.use('/api/reservations', reservationRoutes());
app.use('/api/settings', settingsRoutes());

// Admin creation function
async function createAdminIfNeeded() {
    try {
        // Check if admin exists
        const result = await pool.query(
            'SELECT * FROM users WHERE role = $1',
            ['admin']
        );

        if (result.rows.length === 0) {
            // Create default admin
            const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin', 10);
            await pool.query(
                `INSERT INTO users (username, password_hash, email, role, verified)
                 VALUES ($1, $2, $3, $4, $5)`,
                ['admin', passwordHash, process.env.ADMIN_EMAIL || 'admin@restaurant.com', 'admin', true]
            );
            console.log('Default admin account created');
        }
    } catch (error) {
        console.error('Error creating admin:', error);
    }
}

// Start server
app.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
});