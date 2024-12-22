const Database = require('better-sqlite3');
const path = require('path');

// Get database path from environment or use default
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'dev_db', 'database.sqlite');
const db = new Database(dbPath);

console.log('\n=== Users ===');
const users = db.prepare('SELECT id, username, email, role, created_at FROM users').all();
console.table(users);

console.log('\n=== Reservations ===');
const reservations = db.prepare('SELECT * FROM reservations ORDER BY date, time').all();
console.table(reservations);

console.log('\n=== Settings ===');
const settings = db.prepare('SELECT * FROM settings').all();
console.table(settings); 