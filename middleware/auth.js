// Authentication middleware
function requireAuth(req, res, next) {
    if (!req.session?.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    next();
}

// Admin authorization middleware
function requireAdmin(req, res, next) {
    if (!req.session?.user?.role === 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }
    next();
}

module.exports = {
    requireAuth,
    requireAdmin
}; 