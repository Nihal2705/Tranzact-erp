const jwt = require("jsonwebtoken");
//checking for the user is logged in or not
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token  = header.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Please log in again" });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: "Please log in again" });
  }
}

// right role access for the user
function allowRoles(...roles) {
  return (req, res, next) => {
    if (roles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({ error: "You do not have permission" });
    }
  };
}

module.exports = { requireAuth, allowRoles };
