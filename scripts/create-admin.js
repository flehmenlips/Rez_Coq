require('dotenv').config();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
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

async function promptForCredentials() {
    if (process.env.NODE_ENV === 'production') {
        return {
            email: process.env.ADMIN_EMAIL,
            password: process.env.ADMIN_PASSWORD
        };
    }
    
    return new Promise((resolve) => {
        rl.question('Enter admin email: ', (email) => {
            rl.question('Enter admin password: ', async (password) => {
                rl.close();
                resolve({ email, password });
            });
        });
    });
}

async function createAdmin() {
    try {
        const { email, password } = await promptForCredentials();
        const passwordHash = await bcrypt.hash(password, 10);
        
        // First try to update existing user
        const updateResult = await pool.query(
            `UPDATE users 
             SET role = 'admin', password_hash = $1, verified = true
             WHERE email = $2
             RETURNING id`,
            [passwordHash, email]
        );

        if (updateResult.rows.length === 0) {
            // If no user exists, create new admin
            await pool.query(
                `INSERT INTO users (username, password_hash, email, role, verified)
                 VALUES ($1, $2, $3, $4, $5)`,
                ['admin', passwordHash, email, 'admin', true]
            );
            console.log('New admin account created successfully');
        } else {
            console.log('Existing user updated to admin successfully');
        }
        
        console.log('You can now login with:');
        console.log(`Email: ${email}`);
        process.exit(0);
    } catch (error) {
        console.error('Error creating/updating admin:', error);
        process.exit(1);
    }
}

createAdmin(); 