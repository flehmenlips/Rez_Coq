require('dotenv').config();
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function promptInput(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => resolve(answer));
    });
}

async function createAdmin() {
    try {
        // Get database path from environment or use default
        const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'dev_db', 'database.sqlite');
        const db = new Database(dbPath);

        // First, check existing users
        console.log('\nChecking existing users...');
        const existingUsers = db.prepare('SELECT username, email, role FROM users').all();
        if (existingUsers.length > 0) {
            console.log('\nExisting users:');
            existingUsers.forEach(user => {
                console.log(`- ${user.username} (${user.email}) [${user.role}]`);
            });
        }

        // Get admin credentials
        console.log('\nCreate new admin account:');
        const username = await promptInput('Enter admin username: ');
        const email = await promptInput('Enter admin email: ');
        const password = await promptInput('Enter admin password: ');

        // Check if username or email already exists
        const existingUser = db.prepare('SELECT username, email FROM users WHERE username = ? OR email = ?')
            .get(username, email);

        if (existingUser) {
            if (existingUser.username === username) {
                throw new Error('Username already exists');
            }
            if (existingUser.email === email) {
                throw new Error('Email already exists');
            }
        }

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Insert admin user
        const result = db.prepare(`
            INSERT INTO users (username, password_hash, email, role, verified)
            VALUES (?, ?, ?, 'admin', 1)
        `).run(username, passwordHash, email);

        console.log('\nAdmin account created successfully!');
        console.log(`ID: ${result.lastInsertRowid}`);
        console.log(`Username: ${username}`);
        console.log(`Email: ${email}`);

    } catch (error) {
        console.error('\nError:', error.message);
        console.log('\nPlease try again with different credentials.');
    } finally {
        rl.close();
    }
}

createAdmin(); 