const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function setupDatabase() {
    try {
        // Create tables
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role VARCHAR(50) NOT NULL DEFAULT 'customer' CHECK(role IN ('admin', 'customer')),
                email VARCHAR(255) UNIQUE,
                verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP,
                settings_json TEXT
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
                id SERIAL PRIMARY KEY,
                opening_time TIME NOT NULL DEFAULT '11:00',
                closing_time TIME NOT NULL DEFAULT '22:00',
                slot_duration INTEGER NOT NULL DEFAULT 60,
                reservation_window INTEGER NOT NULL DEFAULT 30,
                window_update_time TIME NOT NULL DEFAULT '00:00',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Add default settings if none exist
        const settingsResult = await pool.query('SELECT * FROM settings LIMIT 1');
        if (settingsResult.rows.length === 0) {
            await pool.query(`
                INSERT INTO settings (
                    opening_time, 
                    closing_time, 
                    slot_duration,
                    reservation_window,
                    window_update_time
                ) VALUES (
                    '11:00',
                    '22:00',
                    60,
                    30,
                    '00:00'
                );
            `);
        }

        console.log('Database setup complete!');
        await pool.end();
    } catch (error) {
        console.error('Database setup failed:', error);
        process.exit(1);
    }
}

setupDatabase(); 