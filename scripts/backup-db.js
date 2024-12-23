const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Get database path
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'dev_db', 'database.sqlite');
const backupPath = path.join(__dirname, '..', 'backups');

// Ensure backup directory exists
if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(backupPath, { recursive: true });
}

// Create backup filename with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(backupPath, `backup-${timestamp}.json`);

try {
    const db = new Database(dbPath);
    
    // Export all data with correct SQL query
    const schema = db.prepare(`
        SELECT name, sql 
        FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all();
    
    const data = {
        schema: schema,
        users: db.prepare('SELECT * FROM users').all(),
        reservations: db.prepare('SELECT * FROM reservations').all(),
        settings: db.prepare('SELECT * FROM settings').all()
    };
    
    // Save to file
    fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));
    console.log(`Backup created: ${backupFile}`);
    
    db.close();
} catch (error) {
    console.error('Backup failed:', error);
    process.exit(1);
} 