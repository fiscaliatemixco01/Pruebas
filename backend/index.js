require('dotenv').config();
const express = require('express');
const pool = require('./db');
const authRoutes = require('./routes/auth');
const estadisticasRoutes = require('./routes/estadisticas'); 
const cors = require('cors');
const carpetasRoutes = require('./routes/carpetas');
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

// Lista de peticiones (usa la vista con nombres legibles)
app.get('/api/peticiones', async (req, res) => {
  try {
    const resultado = await pool.query(
      'SELECT * FROM vw_peticiones ORDER BY fecha_recibido DESC, hora_recibido DESC'
    );
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar peticiones' });
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

// Crear una nueva petición (Soporta numero_llamado manual para FMAP/llamados manuales)
app.post('/api/peticiones', async (req, res) => {
  const {
    llamado_id,
    receptor_id,
    nombre_ministerio_publico,
    con_detenido,
    materia_id,
    numero_carpeta,
    descripcion_solicitud,
    numero_llamado // <-- Recibido desde el frontend si el folio es manual
  } = req.body;

  try {
    const resultado = await pool.query(
      `INSERT INTO peticiones
        (llamado_id, receptor_id, nombre_ministerio_publico, con_detenido, materia_id, numero_carpeta, descripcion_solicitud, numero_llamado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        llamado_id,
        receptor_id,
        nombre_ministerio_publico,
        con_detenido,
        materia_id,
        numero_carpeta,
        descripcion_solicitud,
        numero_llamado || null // Pasa el valor o null si el trigger de PostgreSQL lo auto-genera
      ]
    );

    const nuevaPeticion = resultado.rows[0];

    // Registrar la acción en la bitácora
    await pool.query(
      `INSERT INTO bitacora (us_id, acc_id, pet_id, fecha_hora)
       VALUES ($1, $2, $3, NOW())`,
      [receptor_id, 3, nuevaPeticion.id]
    );

    res.status(201).json(nuevaPeticion);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear la petición' });
  }
});

// Actualizar una petición (asignar perito y marcar entregas)
app.put('/api/peticiones/:id', async (req, res) => {
  const { id } = req.params;
  const {
    perito_id,
    entrega_dictamen,
    entrega_informe,
    entrega_requerimiento,
    quien_recibe_id
  } = req.body;

  try {
    const resultado = await pool.query(
      `UPDATE peticiones
       SET perito_id = $1,
           entrega_dictamen = $2,
           entrega_informe = $3,
           entrega_requerimiento = $4,
           quien_recibe_id = $5
       WHERE id = $6
       RETURNING *`,
      [perito_id, entrega_dictamen, entrega_informe, entrega_requerimiento, quien_recibe_id, id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Petición no encontrada' });
    }

    res.json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar la petición' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});