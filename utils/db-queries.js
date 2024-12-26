const pool = require('./db');

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
async function getReservations() {
    const result = await pool.query(
        'SELECT * FROM reservations ORDER BY date, time'
    );
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
    return result.rows.reduce((acc, row) => {
        acc[row.key] = row.value;
        return acc;
    }, {});
}

async function updateSetting(key, value) {
    await pool.query(
        `INSERT INTO settings (key, value) 
         VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = $2`,
        [key, value]
    );
}

module.exports = {
    getUserByUsername,
    createUser,
    getReservations,
    createReservation,
    getSettings,
    updateSetting
}; 