require('dotenv').config();
const express = require('express');
const pool = require('./db');
const authRoutes = require('./routes/auth');
const estadisticasRoutes = require('./routes/estadisticas');
const cors = require('cors');
const carpetasRoutes = require('./routes/carpetas');
const peticionesRoutes = require('./routes/peticiones');
const { verificarToken, requerirRol } = require('./middleware/auth');
const app = express();
const PORT = process.env.PORT || 3000;

// Nombres de rol: deben coincidir EXACTO con roles.nom_rol en la BD
const ADMIN = 'Administrador';
const PERITO = 'Perito';
const RECEPTOR = 'Receptor';
const CONSULTA = 'Consulta';

app.use(express.json());

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.get('/', (req, res) => {
  res.send('Servidor funcionando');
});

// Login (público). Si aquí está el registro de cuentas, protégelo
// dentro de routes/auth.js con verificarToken + requerirRol(ADMIN).
app.use('/api/auth', authRoutes);

app.use('/api/estadisticas', verificarToken, requerirRol(ADMIN, CONSULTA), estadisticasRoutes);
app.use('/api/carpetas', verificarToken, requerirRol(ADMIN, RECEPTOR), carpetasRoutes);

// Notificaciones: peticiones asignadas al perito de la sesión (el administrador ve todas las asignadas).
// Debe ir ANTES de app.use('/api/peticiones', ...) para que no lo capture una ruta '/:id'.
// Requiere que vw_peticiones exponga perito_id.
app.get('/api/peticiones/asignadas', verificarToken, requerirRol(ADMIN, PERITO), async (req, res) => {
  try {
    const esAdmin = req.usuario.rol === ADMIN;
    const resultado = esAdmin
      ? await pool.query(
          `SELECT * FROM vw_peticiones
            WHERE perito_id IS NOT NULL
            ORDER BY fecha_recibido DESC, hora_recibido DESC`
        )
      : await pool.query(
          `SELECT * FROM vw_peticiones
            WHERE perito_id = $1
            ORDER BY fecha_recibido DESC, hora_recibido DESC`,
          [req.usuario.id]
        );
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar las peticiones asignadas' });
  }
});

// Aquí solo se exige sesión. Los roles por endpoint se definen dentro de
// routes/peticiones.js con requerirRol (ver matriz en la respuesta).
app.use('/api/peticiones', verificarToken, peticionesRoutes);

// Solo administrador. Devuelve todas las columnas de usuarios (incluida la contraseña) más el nombre del rol.
app.get('/api/usuarios', verificarToken, requerirRol(ADMIN), async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT u.*, r.nom_rol AS rol
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       ORDER BY u.nombre`
    );
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar usuarios' });
  }
});

// Catálogo de materias
app.get('/api/materias', verificarToken, requerirRol(ADMIN, RECEPTOR), async (req, res) => {
  try {
    const resultado = await pool.query(
      'SELECT id, nombre FROM materias WHERE activo = true ORDER BY nombre'
    );
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar materias' });
  }
});

// Catálogo de tipos de llamado
app.get('/api/llamados', verificarToken, requerirRol(ADMIN, RECEPTOR), async (req, res) => {
  try {
    const resultado = await pool.query(
      'SELECT id, codigo, es_automatico FROM llamados ORDER BY codigo'
    );
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar llamados' });
  }
});

// Usuarios con rol de Perito
app.get('/api/peritos', verificarToken, requerirRol(ADMIN, RECEPTOR), async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT u.id, u.nombre, u.correo
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       WHERE r.nom_rol = $1
       ORDER BY u.nombre`,
      [PERITO]
    );
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar peritos' });
  }
});

// Bitácora de acciones (solo administrador)
app.get('/api/bitacora', verificarToken, requerirRol(ADMIN), async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT
          b.id,
          p.numero_llamado,
          to_char(b.fecha_hora, 'YYYY-MM-DD') AS fecha,
          to_char(b.fecha_hora, 'HH24:MI') AS hora,
          a.nom_accion AS modificacion,
          u.nombre AS realizado_por
       FROM bitacora b
       JOIN usuarios u ON u.id = b.us_id
       JOIN acciones a ON a.id = b.acc_id
       LEFT JOIN peticiones p ON p.id = b.pet_id
       ORDER BY b.fecha_hora DESC`
    );
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar bitácora' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});