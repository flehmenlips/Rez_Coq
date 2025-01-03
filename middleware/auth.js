// Authentication middleware
function auth(req, res, next) {
    // Add cache control headers
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
    });

    // Skip auth check for login, register pages and auth API endpoints
    if (req.path === '/login' || 
        req.path === '/register' || 
        req.path === '/api/auth/register' ||
        req.path === '/api/auth/login') {
        return next();
    }

    // Check if session exists and is valid
    if (!req.session || !req.session.user || !req.session.created) {
        if (req.xhr || req.path.startsWith('/api/')) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        // Clear any invalid session
        if (req.session) {
            req.session.destroy((err) => {
                if (err) {
                    console.error('Session destruction error:', err);
                }
                res.clearCookie('rez_coq_sid', {
                    path: '/',
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict'
                });
                res.redirect('/login');
            });
        } else {
            res.redirect('/login');
        }
        return;
    }

    // Check session age
    const now = new Date().getTime();
    const sessionStart = new Date(req.session.created).getTime();
    const maxAge = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

    if (now - sessionStart > maxAge) {
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destruction error:', err);
            }
            res.clearCookie('rez_coq_sid', {
                path: '/',
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict'
            });
            if (req.xhr || req.path.startsWith('/api/')) {
                return res.status(401).json({
                    success: false,
                    message: 'Session expired'
                });
            }
            res.redirect('/login');
        });
        return;
    }

    // Add user info to locals for views
    res.locals.user = req.session.user;
    next();
}

// Admin authorization middleware
function requireAdmin(req, res, next) {
    // First run the auth middleware
    auth(req, res, () => {
        if (req.session?.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }
        next();
    });
}

module.exports = {
    auth,
    requireAdmin
}; 