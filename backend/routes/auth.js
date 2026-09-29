const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../db');
const { enviarCorreoCodigo } = require('../mailer');

const router = express.Router();

// Login por correo y contraseña
router.post('/login', async (req, res) => {
  const { correo, contrasena } = req.body;

  if (!correo || !contrasena) {
    return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
  }

  try {
    const resultado = await pool.query(
      `SELECT u.id, u.nombre, u.correo, u.password_hash, u.verificado, r.nom_rol AS rol
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       WHERE u.correo = $1`,
      [correo]
    );

    if (resultado.rows.length === 0) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    const usuario = resultado.rows[0];

    if (!usuario.verificado) {
      return res.status(401).json({ error: 'La cuenta no ha sido verificada' });
    }

    if (!usuario.password_hash) {
      return res.status(401).json({ error: 'Esta cuenta no tiene contraseña configurada' });
    }

    const coincide = await bcrypt.compare(contrasena, usuario.password_hash);
    if (!coincide) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol, nombre: usuario.nombre },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// Genera un código, lo hashea, lo guarda y lo envía por correo
router.post('/enviar-codigo', async (req, res) => {
  const { correo } = req.body;
  if (!correo) {
    return res.status(400).json({ error: 'El correo es obligatorio' });
  }

  try {
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenHash = await bcrypt.hash(codigo, 10);
    const tokenExpira = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    await pool.query(
      `INSERT INTO verificaciones_correo (correo, token_hash, token_expira)
       VALUES ($1, $2, $3)`,
      [correo, tokenHash, tokenExpira]
    );

    await enviarCorreoCodigo(correo, codigo);

    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo enviar el código de verificación' });
  }
});

// Compara el código capturado contra el hash guardado más reciente
router.post('/confirmar-codigo', async (req, res) => {
  const { correo, codigo } = req.body;
  if (!correo || !codigo) {
    return res.status(400).json({ error: 'Correo y código son obligatorios' });
  }

  try {
    const resultado = await pool.query(
      `SELECT id, token_hash FROM verificaciones_correo
       WHERE correo = $1 AND token_expira > NOW() AND verificado = false
       ORDER BY creado_en DESC LIMIT 1`,
      [correo]
    );

    if (resultado.rows.length === 0) {
      return res.status(400).json({ error: 'Código expirado o no solicitado' });
    }

    const coincide = await bcrypt.compare(codigo, resultado.rows[0].token_hash);
    if (!coincide) {
      return res.status(400).json({ error: 'Código incorrecto' });
    }

    await pool.query(
      `UPDATE verificaciones_correo SET verificado = true WHERE id = $1`,
      [resultado.rows[0].id]
    );

    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo confirmar el código' });
  }
});

// Crea la cuenta definitiva, solo si el correo quedó verificado
router.post('/registro', async (req, res) => {
  const { usuario, contrasena, nombre, apellidos, rol, materia } = req.body;

  try {
    const verificado = await pool.query(
      `SELECT id FROM verificaciones_correo
       WHERE correo = $1 AND verificado = true
       ORDER BY creado_en DESC LIMIT 1`,
      [usuario]
    );
    if (verificado.rows.length === 0) {
      return res.status(400).json({ error: 'El correo no ha sido verificado' });
    }

    const rolResultado = await pool.query(`SELECT id FROM roles WHERE nom_rol = $1`, [rol]);
    if (rolResultado.rows.length === 0) {
      return res.status(400).json({ error: 'Rol no válido' });
    }
    const rolId = rolResultado.rows[0].id;

    const esPerito = rol === 'Perito';
    let materiaId = null;
    if (esPerito) {
      if (!materia) {
        return res.status(400).json({ error: 'La materia es obligatoria para el rol de perito' });
      }
      const materiaResultado = await pool.query(`SELECT id FROM materias WHERE nombre = $1`, [materia]);
      if (materiaResultado.rows.length === 0) {
        return res.status(400).json({ error: 'Materia no válida' });
      }
      materiaId = materiaResultado.rows[0].id;
    }

    const nombreCompleto = `${nombre} ${apellidos}`.trim();
    const passwordHash = await bcrypt.hash(contrasena, 10);

    const nuevoUsuario = await pool.query(
      `INSERT INTO usuarios (nombre, correo, rol_id, password_hash, verificado, materia_id)
       VALUES ($1, $2, $3, $4, TRUE, $5)
       RETURNING id, nombre, correo`,
      [nombreCompleto, usuario, rolId, passwordHash, materiaId]
    );

    res.status(201).json(nuevoUsuario.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo crear la cuenta' });
  }
});

module.exports = router;