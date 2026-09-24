require('dotenv').config();
const express = require('express');
const pool = require('./db');
const authRoutes = require('./routes/auth');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(express.json());


app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.get('/', (req, res) => {
  res.send('Servidor funcionando');
});

app.use('/api/auth', authRoutes);

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

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});