// Authentication middleware
const auth = (req, res, next) => {
    // Skip authentication for public routes
    const publicPaths = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/logout',
        '/api/auth/check-session',
        '/login',
        '/register',
        '/css/',
        '/js/',
        '/img/',
        '/favicon.ico'
    ];

    console.log('Auth middleware:', {
        path: req.path,
        method: req.method,
        isXHR: req.xhr,
        sessionID: req.sessionID,
        hasSession: !!req.session,
        hasUser: !!req.session?.user,
        userRole: req.session?.user?.role
    });

    // Skip auth for public paths
    if (publicPaths.some(path => req.path === path || req.path.startsWith(path))) {
        return next();
    }

    // Check if user is authenticated
    if (!req.session?.user) {
        console.log('No user session found, redirecting to login');
        if (req.xhr || req.path.startsWith('/api/')) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        return res.redirect('/login');
    }

    // For admin routes, check admin role
    if (req.path.startsWith('/api/admin') || req.path === '/dashboard') {
        if (req.session.user.role !== 'admin') {
            console.log('Non-admin user attempting to access admin route');
            if (req.xhr || req.path.startsWith('/api/')) {
                return res.status(403).json({
                    success: false,
                    message: 'Admin access required'
                });
            }
            return res.redirect('/');
        }
    }

    // Add user to locals for views
    res.locals.user = req.session.user;
    next();
};

module.exports = { auth }; 