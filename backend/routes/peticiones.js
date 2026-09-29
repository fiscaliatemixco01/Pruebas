// backend/routes/peticiones.js
const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /api/peticiones?numero_llamado=&perito=&fecha=&numero_carpeta=
// Lista de peticiones (usa la vista con nombres legibles).
// Los filtros son opcionales: si no se mandan, regresa todo como antes.
router.get('/', async (req, res) => {
  const { numero_llamado, perito, fecha, numero_carpeta } = req.query;

  const condiciones = [];
  const params = [];

  if (numero_llamado && numero_llamado.trim()) {
    params.push(`%${numero_llamado.trim()}%`);
    condiciones.push(`numero_llamado ILIKE $${params.length}`);
  }
  if (perito && perito.trim()) {
    params.push(`%${perito.trim()}%`);
    condiciones.push(`nombre_perito ILIKE $${params.length}`);
  }
  if (numero_carpeta && numero_carpeta.trim()) {
    params.push(`%${numero_carpeta.trim()}%`);
    condiciones.push(`numero_carpeta ILIKE $${params.length}`);
  }
  if (fecha && fecha.trim()) {
    params.push(fecha.trim());
    condiciones.push(`fecha_recibido = $${params.length}`);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  try {
    const resultado = await pool.query(
      `SELECT * FROM vw_peticiones
       ${where}
       ORDER BY fecha_recibido DESC, hora_recibido DESC`,
      params
    );
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar peticiones' });
  }
});

// GET /api/peticiones/:id  ->  UNA petición (para "ver y editar")
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ error: 'Id de petición inválido' });
  }

  try {
    const resultado = await pool.query(
      'SELECT * FROM vw_peticiones WHERE id = $1',
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Petición no encontrada' });
    }

    res.json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener la petición' });
  }
});

// POST /api/peticiones
// Crear una nueva petición (soporta numero_llamado manual para FMG/FMAP)
router.post('/', async (req, res) => {
  const {
    llamado_id,
    receptor_id,
    nombre_ministerio_publico,
    con_detenido,
    materia_id,
    numero_carpeta,
    descripcion_solicitud,
    numero_llamado, // viene del frontend si el folio es manual
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
        numero_llamado || null, // null si el trigger de PostgreSQL lo genera
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

// PUT /api/peticiones/:id
// Actualizar una petición (asignar perito y marcar entregas)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    perito_id,
    entrega_dictamen,
    entrega_informe,
    entrega_requerimiento,
    quien_recibe_id,
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

module.exports = router;