const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Get latest backup
const backupPath = path.join(__dirname, '..', 'backups');
const backups = fs.readdirSync(backupPath).filter(f => f.startsWith('backup-'));
const latestBackup = backups.sort().pop();

if (!latestBackup) {
    console.error('No backup files found');
    process.exit(1);
}

// Read backup
const backupFile = path.join(backupPath, latestBackup);
const data = JSON.parse(fs.readFileSync(backupFile));

// Get database path
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'dev_db', 'database.sqlite');

try {
    const db = new Database(dbPath);
    
    // Restore data
    db.prepare('DELETE FROM users').run();
    db.prepare('DELETE FROM reservations').run();
    db.prepare('DELETE FROM settings').run();
    
    data.users.forEach(user => {
        db.prepare('INSERT INTO users (id, username, password_hash, role, email, verified, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
            user.id, user.username, user.password_hash, user.role, user.email, user.verified, user.created_at
        );
    });
    
    data.reservations.forEach(res => {
        db.prepare('INSERT INTO reservations (id, name, email, phone, date, time, guests, created_at, email_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
            res.id, res.name, res.email, res.phone, res.date, res.time, res.guests, res.created_at, res.email_status
        );
    });
    
    data.settings.forEach(setting => {
        db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(
            setting.key, setting.value
        );
    });
    
    console.log(`Database restored from ${backupFile}`);
    db.close();
} catch (error) {
    console.error('Restore failed:', error);
    process.exit(1);
} 