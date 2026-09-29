const jwt = require('jsonwebtoken');
const pool = require('../db');

function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No se proporcionó token de autenticación' });
  }

  const token = authHeader.split(' ')[1];

  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function requerirRol(...rolesPermitidos) {
  return async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT r.nom_rol
           FROM usuarios u
           JOIN roles r ON r.id = u.rol_id
          WHERE u.id = $1`,
        [req.usuario.id]
      );

      const rol = rows[0]?.nom_rol;
      if (!rol || !rolesPermitidos.includes(rol)) {
        return res.status(403).json({ error: 'No tienes permiso para esta acción' });
      }

      req.usuario.rol = rol;
      next();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al verificar permisos' });
    }
  };
}

module.exports = { verificarToken, requerirRol };