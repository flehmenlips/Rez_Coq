// Authentication middleware
const auth = (req, res, next) => {
    // Skip authentication for public routes
    const publicPaths = ['/api/auth/login', '/api/auth/register', '/api/auth/logout'];
    if (publicPaths.includes(req.path)) {
        return next();
    }

    // Check if user is authenticated
    if (!req.session?.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    next();
};

module.exports = { auth }; 