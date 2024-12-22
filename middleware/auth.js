// Authentication middleware
function auth(req, res, next) {
    // Add cache control headers
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });

    // Debug logging
    console.log('Auth check:', {
        path: req.path,
        hasSession: !!req.session,
        hasUser: !!req.session?.user,
        isXHR: req.xhr,
        isAPI: req.path.startsWith('/api/')
    });

    // Skip auth check for login and register pages
    if (req.path === '/login' || req.path === '/register') {
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

module.exports = auth; 