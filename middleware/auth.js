// Authentication middleware
function auth(req, res, next) {
    // Check if user is authenticated
    if (!req.session?.user) {
        if (req.xhr || req.path.startsWith('/api/')) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        return res.redirect('/login');
    }
    next();
}

module.exports = auth; 