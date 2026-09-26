// backend/routes/estadisticas.js
const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /api/estadisticas/conteos?materia_id=
// -> { dia, semana, mes }
router.get('/conteos', async (req, res) => {
  const { materia_id } = req.query;

  try {
    const filtroMateria = materia_id ? 'AND materia_id = $1' : '';
    const params = materia_id ? [materia_id] : [];

    const resultado = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE fecha_recibido = CURRENT_DATE) AS dia,
         COUNT(*) FILTER (WHERE fecha_recibido >= date_trunc('week', CURRENT_DATE)) AS semana,
         COUNT(*) FILTER (WHERE fecha_recibido >= date_trunc('month', CURRENT_DATE)) AS mes
       FROM peticiones
       WHERE true ${filtroMateria}`,
      params
    );

    const fila = resultado.rows[0];
    res.json({
      dia: Number(fila.dia),
      semana: Number(fila.semana),
      mes: Number(fila.mes),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar conteos' });
  }
});

// GET /api/estadisticas/por-materia
// -> [{ materia_id, materia, total }]
router.get('/por-materia', async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT m.id AS materia_id, m.nombre AS materia, COUNT(p.id) AS total
       FROM materias m
       LEFT JOIN peticiones p ON p.materia_id = m.id
       WHERE m.activo = true
       GROUP BY m.id, m.nombre
       ORDER BY m.nombre`
    );

    const filas = resultado.rows.map((r) => ({
      materia_id: r.materia_id,
      materia: r.materia,
      total: Number(r.total),
    }));

    res.json(filas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar estadísticas por materia' });
  }
});

module.exports = router;