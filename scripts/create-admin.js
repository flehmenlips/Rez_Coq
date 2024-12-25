require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function promptInput(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => resolve(answer));
    });
}

async function listExistingUsers() {
    const result = await pool.query('SELECT username, email, role FROM users');
    console.log('\nExisting users:');
    result.rows.forEach(user => {
        console.log(`- ${user.username} (${user.email}) [${user.role}]`);
    });
}

async function createAdmin() {
    try {
        await listExistingUsers();

        // Get admin credentials
        console.log('\nCreate new admin account:');
        const username = await promptInput('Enter admin username: ');
        const email = await promptInput('Enter admin email: ');
        const password = await promptInput('Enter admin password: ');

        // Check if username or email exists
        const existingUser = await pool.query(
            'SELECT username, email FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (existingUser.rows.length > 0) {
            throw new Error('Username or email already exists');
        }

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Insert admin user
        const result = await pool.query(
            `INSERT INTO users (username, password_hash, email, role, verified)
             VALUES ($1, $2, $3, 'admin', true) RETURNING id`,
            [username, passwordHash, email]
        );

        console.log('\nAdmin account created successfully!');
        console.log(`ID: ${result.rows[0].id}`);
        console.log(`Username: ${username}`);
        console.log(`Email: ${email}`);

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    } finally {
        rl.close();
    }
}

createAdmin(); 