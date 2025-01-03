// Authentication middleware
function auth(req, res, next) {
    console.log('\nAuth Middleware Debug:');
    console.log('Path:', req.path);
    console.log('Method:', req.method);
    console.log('Headers:', {
        'x-forwarded-proto': req.get('x-forwarded-proto'),
        'x-forwarded-for': req.get('x-forwarded-for')
    });
    console.log('Session:', {
        id: req.sessionID,
        hasSession: !!req.session,
        user: req.session?.user,
        cookie: req.session?.cookie
    });

    // Add cache control headers
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });

    // Skip auth check for public routes and assets
    if (req.path === '/login' || 
        req.path === '/register' || 
        req.path === '/api/auth/register' ||
        req.path === '/api/auth/login' ||
        req.path.startsWith('/css/') ||
        req.path.startsWith('/js/') ||
        req.path.startsWith('/img/')) {
        console.log('Skipping auth check for public route');
        return next();
    }

    // Check if session exists and is valid
    if (!req.session) {
        console.log('No session object found');
        if (req.xhr || req.path.startsWith('/api/')) {
            return res.status(401).json({
                success: false,
                message: 'No session found'
            });
        }
        return res.redirect('/login?error=No session found');
    }

    if (!req.session.user) {
        console.log('No user in session');
        if (req.xhr || req.path.startsWith('/api/')) {
            return res.status(401).json({
                success: false,
                message: 'Session expired'
            });
        }
        return res.redirect('/login?error=Session expired');
    }

    console.log('Auth check passed for user:', req.session.user.username);
    // Add user info to locals for views
    res.locals.user = req.session.user;
    next();
}

// Admin authorization middleware
function requireAdmin(req, res, next) {
    if (!req.session?.user) {
        console.log('No session found in admin check');
        return res.redirect('/login?error=Admin session expired');
    }
    
    if (req.session.user.role !== 'admin') {
        console.log('Non-admin access attempt:', req.session.user);
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }
    console.log('Admin check passed for:', req.session.user.username);
    next();
}

module.exports = {
    auth,
    requireAdmin
}; 