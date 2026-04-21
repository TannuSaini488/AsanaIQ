function roleGuard(...allowedRoles) {
  return (req, _res, next) => {
    const role = req.user?.role;
    if (!role) {
      const err = new Error('User role not found');
      err.status = 403;
      return next(err);
    }
    if (!allowedRoles.includes(role)) {
      const err = new Error('Forbidden: insufficient role');
      err.status = 403;
      return next(err);
    }
    return next();
  };
}

module.exports = roleGuard;
