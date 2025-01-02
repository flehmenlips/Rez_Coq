const pool = require('./db');

const defaultSettings = {
    daily_max_guests: '100',
    max_party_size: '10',
    opening_time: '11:00',
    closing_time: '22:00',
    slot_duration: '60',
    reservation_window: '30',
    window_update_time: '00:00'
};

// User queries
async function getUserByUsername(username) {
    const result = await pool.query(
        'SELECT * FROM users WHERE username = $1',
        [username]
    );
    return result.rows[0];
}

async function createUser(username, passwordHash, email, role = 'customer') {
    const result = await pool.query(
        `INSERT INTO users (username, password_hash, email, role, verified)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [username, passwordHash, email, role, false]
    );
    return result.rows[0];
}

// Reservation queries
async function getReservations(userEmail = null) {
    let query = 'SELECT * FROM reservations';
    const params = [];
    
    if (userEmail) {
        query += ' WHERE email = $1';
        params.push(userEmail);
    }
    
    query += ' ORDER BY date, time';
    const result = await pool.query(query, params);
    return result.rows;
}

async function createReservation(data) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get settings
        const settings = await getSettings();
        console.log('Validating reservation against settings:', { data, settings });

        // Validate party size
        const maxPartySize = parseInt(settings.max_party_size);
        if (data.guests > maxPartySize) {
            throw new Error(`Party size cannot exceed ${maxPartySize} guests`);
        }

        // Get existing reservations for the date
        const existingRes = await client.query(
            'SELECT SUM(guests) as total_guests FROM reservations WHERE date = $1',
            [data.date]
        );
        
        const currentTotal = parseInt(existingRes.rows[0]?.total_guests || 0);
        const dailyMax = parseInt(settings.daily_max_guests);
        
        // Check if new reservation would exceed daily capacity
        if (currentTotal + data.guests > dailyMax) {
            throw new Error(`This reservation would exceed our daily capacity of ${dailyMax} guests`);
        }

        // Create the reservation
        const result = await client.query(
            `INSERT INTO reservations 
             (name, email, phone, date, time, guests, email_status)
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING *`,
            [data.name, data.email, data.phone, data.date, data.time, 
             data.guests, 'pending']
        );

        await client.query('COMMIT');
        console.log('Reservation created successfully:', result.rows[0]);
        return result.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating reservation:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Settings queries
async function getSettings() {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT key, value FROM settings');
        console.log('Retrieved settings rows:', result.rows);
        
        // Convert rows to object
        const settings = result.rows.reduce((acc, row) => {
            acc[row.key] = row.value;
            return acc;
        }, {});
        
        console.log('Converted settings:', settings);
        return settings;
    } catch (error) {
        console.error('Database error in getSettings:', error);
        throw error;
    } finally {
        client.release();
    }
}

async function updateSettings(settings) {
    const client = await pool.connect();
    try {
        console.log('Updating settings in database:', settings);
        
        // Start a transaction
        await client.query('BEGIN');
        
        // Delete existing settings
        await client.query('DELETE FROM settings');
        
        // Insert new settings
        for (const [key, value] of Object.entries(settings)) {
            await client.query(
                'INSERT INTO settings (key, value) VALUES ($1, $2)',
                [key, String(value)]
            );
        }
        
        // Commit transaction
        await client.query('COMMIT');
        
        console.log('Settings updated successfully');
        return settings;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Database error in updateSettings:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Initialize settings if they don't exist
async function initializeSettings() {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT COUNT(*) FROM settings');
        if (result.rows[0].count === '0') {
            await client.query('BEGIN');
            
            // Use all settings from defaultSettings
            for (const [key, value] of Object.entries(defaultSettings)) {
                await client.query(
                    'INSERT INTO settings (key, value) VALUES ($1, $2)',
                    [key, String(value)]
                );
            }
            
            await client.query('COMMIT');
            console.log('Initial settings created:', defaultSettings);
        }
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error initializing settings:', error);
        throw error;
    } finally {
        client.release();
    }
}

module.exports = {
    getUserByUsername,
    createUser,
    getReservations,
    createReservation,
    getSettings,
    updateSettings,
    initializeSettings
}; 