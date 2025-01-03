require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const { testConnection } = require('./utils/db');
const { initializeDatabase } = require('./utils/db-queries');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const settingsRoutes = require('./routes/settings');
const reservationRoutes = require('./routes/reservations');
const auth = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    name: 'rez_coq_session',
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes that don't require authentication
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

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

// Auth routes (don't require authentication)
app.use('/api/auth', authRoutes);

// Apply auth middleware to protected routes
app.use(auth);

// Protected routes
app.get('/dashboard', (req, res) => {
    if (req.session?.user?.role !== 'admin') {
        return res.status(403).send('Access denied');
    }
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/user-settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'user-settings.html'));
});

// API routes (all require authentication)
app.use('/api/settings', settingsRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/admin', adminRoutes());

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