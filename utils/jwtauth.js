const jwt = require('jsonwebtoken');

/**
 * Middleware pour vérifier la présence et la validité du JWT.
 * Si le token est valide, on récupère payload.id et payload.role dans req.user.
 */
function authenticateToken(req, res, next) {
  // On s'attend à un header Authorization: "Bearer <token>"
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token manquant, accès non autorisé.' });
  }

  const secret = process.env.JWT_SECRET || 'secret_key';
  jwt.verify(token, secret, (err, payload) => {
    if (err) {
      return res.status(403).json({ message: 'Token invalide ou expiré.' });
    }
    // On peut par exemple avoir payload = { id: '<ObjectId>', role: 'user', iat: ..., exp: ... }
    req.user = payload;
    next();
  });
}

module.exports = { authenticateToken };
