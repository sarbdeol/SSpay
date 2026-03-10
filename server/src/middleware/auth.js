// ============================================
// Auth Middleware - JWT Token Verification
// ============================================
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

/**
 * Verify JWT token from Authorization header or cookie
 * Attaches user object to req.user
 */
const auth = async (req, res, next) => {
  try {
    // Get token from header or cookie
    let token = null;
    
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        isActive: true,
        adminId: true,
        merchantId: true,
        subMerchantId: true,
        agentId: true,
        operatorId: true,
        collectorId: true,
      }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

/**
 * Role-based access control middleware
 * Usage: roleCheck('ADMIN', 'SUPER_ADMIN')
 */
const roleCheck = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
};

module.exports = { auth, roleCheck };
