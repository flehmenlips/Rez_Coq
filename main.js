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

// Start server
app.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
});