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
    const result = await pool.query('SELECT * FROM settings');
    const settings = result.rows.reduce((acc, row) => {
        acc[row.key] = row.value;
        return acc;
    }, {});

    // Merge with default settings
    return { ...defaultSettings, ...settings };
}

async function updateSetting(key, value) {
    await pool.query(
        `INSERT INTO settings (key, value) 
         VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = $2`,
        [key, value]
    );
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