const auth = (req, res, next) => {
    // Check if user is logged in
    if (!req.session?.user?.id) {
        if (req.xhr) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        return res.redirect('/login');
    }
    next();
};

module.exports = auth; 