const pool = require('./db');

const defaultSettings = {
    daily_max_guests: 100,
    max_party_size: 10,
    opening_time: '11:00',
    closing_time: '22:00',
    slot_duration: 60
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
    const result = await pool.query(
        `INSERT INTO reservations 
         (name, email, phone, date, time, guests, email_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [data.name, data.email, data.phone, data.date, data.time, 
         data.guests, 'pending']
    );
    return result.rows[0];
}

// Settings queries
async function getSettings() {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM settings LIMIT 1');
        console.log('Retrieved settings:', result.rows[0]);
        return result.rows[0] || {};
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
        
        const {
            opening_time,
            closing_time,
            slot_duration,
            reservation_window,
            window_update_time
        } = settings;

        const result = await client.query(`
            UPDATE settings 
            SET opening_time = $1,
                closing_time = $2,
                slot_duration = $3,
                reservation_window = $4,
                window_update_time = $5,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = (SELECT id FROM settings LIMIT 1)
            RETURNING *
        `, [
            opening_time,
            closing_time,
            slot_duration,
            reservation_window,
            window_update_time
        ]);

        if (result.rowCount === 0) {
            // No rows were updated, insert new settings
            console.log('No existing settings found, creating new settings');
            const insertResult = await client.query(`
                INSERT INTO settings (
                    opening_time,
                    closing_time,
                    slot_duration,
                    reservation_window,
                    window_update_time
                ) VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `, [
                opening_time,
                closing_time,
                slot_duration,
                reservation_window,
                window_update_time
            ]);
            return insertResult.rows[0];
        }

        console.log('Settings updated successfully:', result.rows[0]);
        return result.rows[0];
    } catch (error) {
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
        const result = await client.query('SELECT * FROM settings LIMIT 1');
        if (result.rows.length === 0) {
            await client.query(`
                INSERT INTO settings (
                    opening_time,
                    closing_time,
                    slot_duration,
                    reservation_window,
                    window_update_time
                ) VALUES (
                    $1, $2, $3, $4, $5
                )
            `, [
                defaultSettings.opening_time,
                defaultSettings.closing_time,
                defaultSettings.slot_duration,
                30, // default reservation window
                '00:00' // default window update time
            ]);
        }
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