const { query } = require('./db');

// Initialize settings
async function initializeSettings() {
    try {
        // Check if settings exist
        const result = await query('SELECT COUNT(*) FROM settings');
        if (parseInt(result.rows[0].count) > 0) {
            console.log('Settings already exist');
            return;
        }

        // Insert default settings
        const defaultSettings = {
            opening_time: '11:00',
            closing_time: '22:00',
            slot_duration: '60',
            max_party_size: '12',
            daily_max_guests: '100'
        };

        for (const [key, value] of Object.entries(defaultSettings)) {
            await query(
                'INSERT INTO settings (key, value) VALUES ($1, $2)',
                [key, value]
            );
        }

        console.log('Default settings initialized');
    } catch (error) {
        console.error('Error initializing settings:', error);
        throw error;
    }
}

// Initialize tables
async function initializeTables() {
    try {
        // Create tables
        await query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role VARCHAR(50) NOT NULL DEFAULT 'customer',
                email VARCHAR(255) UNIQUE,
                verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            )
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS reservations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                phone VARCHAR(50),
                date DATE NOT NULL,
                time TIME NOT NULL,
                guests INTEGER NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                email_status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                email_sent_at TIMESTAMP
            )
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS settings (
                key VARCHAR(255) PRIMARY KEY,
                value TEXT NOT NULL
            )
        `);

        console.log('Database tables initialized');
    } catch (error) {
        console.error('Error initializing tables:', error);
        throw error;
    }
}

// Create default admin if needed
async function createAdminIfNeeded() {
    try {
        // Check if admin exists
        const result = await query(
            'SELECT COUNT(*) FROM users WHERE role = $1',
            ['admin']
        );

        if (parseInt(result.rows[0].count) === 0) {
            const bcrypt = require('bcrypt');
            const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin', 10);

            await query(
                `INSERT INTO users (username, password_hash, email, role, verified)
                 VALUES ($1, $2, $3, $4, $5)`,
                ['admin', passwordHash, process.env.ADMIN_EMAIL || 'admin@restaurant.com', 'admin', true]
            );

            console.log('Default admin account created');
        } else {
            console.log('Admin account already exists');
        }
    } catch (error) {
        console.error('Error creating admin:', error);
        throw error;
    }
}

// Initialize database
async function initializeDatabase() {
    try {
        await initializeTables();
        await createAdminIfNeeded();
        await initializeSettings();
        console.log('Database initialization complete');
    } catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    }
}

module.exports = {
    initializeDatabase,
    initializeSettings,
    createAdminIfNeeded
}; 