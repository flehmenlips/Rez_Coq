// Authentication middleware
const auth = (req, res, next) => {
    // Skip authentication for public routes
    const publicPaths = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/logout',
        '/login',
        '/register',
        '/css/',
        '/js/',
        '/img/',
        '/favicon.ico'
    ];

    // Skip auth for public paths
    if (publicPaths.some(path => req.path === path || req.path.startsWith(path))) {
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

    // For admin routes, check admin role
    if (req.path.startsWith('/api/admin') || req.path === '/dashboard') {
        if (req.session.user.role !== 'admin') {
            if (req.xhr || req.path.startsWith('/api/')) {
                return res.status(403).json({
                    success: false,
                    message: 'Admin access required'
                });
            }
            return res.redirect('/');
        }
    }

    next();
};

module.exports = { auth }; 