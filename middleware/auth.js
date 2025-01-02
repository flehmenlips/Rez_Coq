// Authentication middleware
function auth(req, res, next) {
    // Add cache control headers
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });

    // Skip auth check for login, register pages and auth API endpoints
    if (req.path === '/login' || 
        req.path === '/register' || 
        req.path === '/api/auth/register' ||
        req.path === '/api/auth/login') {
        return next();
    }

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

    // Add user info to locals for views
    res.locals.user = req.session.user;
    next();
}

// Admin authorization middleware
function requireAdmin(req, res, next) {
    if (req.session?.user?.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }
    next();
}

module.exports = {
    auth,
    requireAdmin
}; 