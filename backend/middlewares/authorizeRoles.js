export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    const userRole = req.admin?.role || req.user?.role;
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient privileges.",
      });
    }
    next();
  };
};
