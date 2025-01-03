const { Pool } = require('pg');

// Create a new pool using environment variables
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false
});

// Add error handler
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Add connection testing
async function testConnection() {
    let client;
    try {
        client = await pool.connect();
        await client.query('SELECT NOW()');
        console.log('Database connection successful');
        return true;
    } catch (err) {
        console.error('Database connection error:', err);
        return false;
    } finally {
        if (client) {
            client.release();
        }
    }
}

// Helper function to execute queries
async function query(text, params = []) {
    let client;
    try {
        client = await pool.connect();
        const result = await client.query(text, params);
        return result;
    } catch (err) {
        console.error('Database query error:', err);
        throw err;
    } finally {
        if (client) {
            client.release();
        }
    }
}

// Export a function that returns the query function
// This ensures the function is bound correctly
module.exports = {
    testConnection,
    query: (text, params) => query(text, params)
}; 