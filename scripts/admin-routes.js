// Add to main.js (protected by admin role)
app.get('/api/admin/db-view', auth, async (req, res) => {
    if (req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    try {
        const data = {
            users: db.prepare('SELECT id, username, email, role, created_at FROM users').all(),
            reservations: db.prepare('SELECT * FROM reservations ORDER BY date, time').all(),
            settings: db.prepare('SELECT * FROM settings').all()
        };
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}); 