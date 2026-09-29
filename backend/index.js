require('dotenv').config();
const express = require('express');
const pool = require('./db');
const authRoutes = require('./routes/auth');
const estadisticasRoutes = require('./routes/estadisticas');
const cors = require('cors');
const carpetasRoutes = require('./routes/carpetas');
const peticionesRoutes = require('./routes/peticiones');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.get('/', (req, res) => {
  res.send('Servidor funcionando');
});

app.use('/api/auth', authRoutes);
app.use('/api/estadisticas', estadisticasRoutes);
app.use('/api/carpetas', carpetasRoutes);
app.use('/api/peticiones', peticionesRoutes);

app.get('/api/usuarios', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM usuarios');
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar usuarios' });
  }
});

// Catálogo de materias
app.get('/api/materias', async (req, res) => {
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
app.get('/api/llamados', async (req, res) => {
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
app.get('/api/peritos', async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT u.id, u.nombre, u.correo
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       WHERE r.nom_rol = $1
       ORDER BY u.nombre`,
      ['Perito']
    );
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar peritos' });
  }
});

// Bitácora de acciones
app.get('/api/bitacora', async (req, res) => {
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