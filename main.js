require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const { Pool } = require('pg');
const ConnectPgSimple = require('connect-pg-simple')(session);
const { testConnection } = require('./utils/db');
const { initializeDatabase } = require('./utils/db-queries');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const settingsRoutes = require('./routes/settings');
const reservationRoutes = require('./routes/reservations');
const { auth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Create pool for session store
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session configuration
app.use(session({
    store: new ConnectPgSimple({
        pool: pool,
        tableName: 'session',
        createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    name: 'rez_coq_session',
    proxy: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Add session debug middleware
app.use((req, res, next) => {
    console.log('Session debug:', {
        id: req.sessionID,
        user: req.session?.user,
        cookie: req.session?.cookie
    });
    next();
});

// Trust proxy for secure cookies behind reverse proxy
app.set('trust proxy', 1);

// Serve static files that don't require auth
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        } else if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));

// Auth routes (don't require authentication)
app.use('/api/auth', authRoutes);

// Routes that don't require authentication
app.get('/', (req, res) => {
    if (!req.session?.user) {
        return res.redirect('/login');
    }
    if (req.session.user.role === 'admin') {
        return res.redirect('/dashboard');
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    if (req.session?.user) {
        return res.redirect(req.session.user.role === 'admin' ? '/dashboard' : '/');
    }
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    if (req.session?.user) {
        return res.redirect(req.session.user.role === 'admin' ? '/dashboard' : '/');
    }
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Apply auth middleware to protected routes
app.use(auth);

// Protected routes
app.get('/dashboard', (req, res) => {
    if (req.session?.user?.role !== 'admin') {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/user-settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'user-settings.html'));
});

// API routes (all require authentication)
app.use('/api/settings', settingsRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/admin', adminRoutes);

// Catch-all route for undefined paths
app.get('*', (req, res) => {
    res.redirect(req.session?.user ? '/' : '/login');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Initialize database and start server
async function startServer() {
    try {
        // Test database connection
        const isConnected = await testConnection();
        if (!isConnected) {
            throw new Error('Could not connect to database');
        }
        console.log('Database connected successfully');

        // Initialize database
        await initializeDatabase();
        console.log('Database initialization complete');
        
        // Start server
        app.listen(PORT, () => {
            console.log(`Server running at http://0.0.0.0:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();