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
        return result.rows[0] || {};
    } finally {
        client.release();
    }
}

async function updateSettings(settings) {
    const client = await pool.connect();
    try {
        const {
            opening_time,
            closing_time,
            slot_duration,
            reservation_window,
            window_update_time
        } = settings;

        await client.query(`
            UPDATE settings 
            SET opening_time = $1,
                closing_time = $2,
                slot_duration = $3,
                reservation_window = $4,
                window_update_time = $5,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = (SELECT id FROM settings LIMIT 1)
        `, [opening_time, closing_time, slot_duration, reservation_window, window_update_time]);

        return true;
    } finally {
        client.release();
    }
}

// Initialize settings if they don't exist
async function initializeSettings() {
    for (const [key, value] of Object.entries(defaultSettings)) {
        await updateSetting(key, value.toString());
    }
}

module.exports = {
    getUserByUsername,
    createUser,
    getReservations,
    createReservation,
    getSettings,
    updateSetting,
    initializeSettings
}; 