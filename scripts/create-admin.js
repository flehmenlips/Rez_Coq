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

        // Get admin credentials
        const username = await promptInput('Enter admin username: ');
        const email = await promptInput('Enter admin email: ');
        const password = await promptInput('Enter admin password: ');

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
        console.error('Error creating admin:', error.message);
    } finally {
        rl.close();
    }
}

createAdmin(); 