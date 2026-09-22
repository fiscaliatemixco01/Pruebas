const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

// Login TEMPORAL mientras se integra reconocimiento facial.
// Solo busca el usuario por correo y le da su token — SIN verificar identidad real.
// TODO: reemplazar por comparación de vector biométrico (Fase 1b).
router.post('/login', async (req, res) => {
  const { correo } = req.body;

  if (!correo) {
    return res.status(400).json({ error: 'El correo es obligatorio' });
  }

  try {
    const resultado = await pool.query(
      `SELECT u.id, u.nombre, u.correo, r.nom_rol AS rol
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       WHERE u.correo = $1`,
      [correo]
    );

    if (resultado.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const usuario = resultado.rows[0];

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol, nombre: usuario.nombre },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, usuario });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

module.exports = router;