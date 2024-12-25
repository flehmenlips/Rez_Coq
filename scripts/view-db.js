require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function viewDatabase() {
    try {
        // Get users
        const users = await pool.query(`
            SELECT id, username, email, role, created_at, last_login 
            FROM users ORDER BY created_at DESC
        `);
        
        console.log('\nUsers:');
        users.rows.forEach(user => {
            console.log(`- ${user.username} (${user.email})`);
            console.log(`  Role: ${user.role}`);
            console.log(`  Created: ${user.created_at}`);
            console.log(`  Last login: ${user.last_login || 'Never'}\n`);
        });

        // Get reservations
        const reservations = await pool.query(`
            SELECT * FROM reservations 
            ORDER BY date DESC, time DESC
        `);
        
        console.log('\nReservations:');
        reservations.rows.forEach(res => {
            console.log(`- ${res.name} (${res.email})`);
            console.log(`  Date: ${res.date}, Time: ${res.time}`);
            console.log(`  Guests: ${res.guests}`);
            console.log(`  Email status: ${res.email_status}\n`);
        });

        // Get settings
        const settings = await pool.query('SELECT * FROM settings');
        
        console.log('\nSettings:');
        settings.rows.forEach(setting => {
            console.log(`- ${setting.key}: ${setting.value}`);
        });

        await pool.end();
    } catch (error) {
        console.error('Error viewing database:', error);
        process.exit(1);
    }
}

viewDatabase(); 