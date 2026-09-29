const express = require('express');
const pool = require('../db');

const router = express.Router();

// Catálogo de carpetas activas
router.get('/', async (req, res) => {
  try {
    const resultado = await pool.query(
      'SELECT id, numero_carpeta FROM carpetas WHERE activo = true ORDER BY numero_carpeta'
    );
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar carpetas' });
  }
});

// Crear carpeta nueva
router.post('/', async (req, res) => {
  const { numero_carpeta } = req.body;
  if (!numero_carpeta || !numero_carpeta.trim()) {
    return res.status(400).json({ error: 'El número de carpeta es obligatorio' });
  }

  try {
    const resultado = await pool.query(
      `INSERT INTO carpetas (numero_carpeta) VALUES ($1) RETURNING id, numero_carpeta`,
      [numero_carpeta.trim()]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      // violación de UNIQUE
      return res.status(409).json({ error: 'Ese número de carpeta ya existe' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al crear la carpeta' });
  }
});

// Baja lógica
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const resultado = await pool.query(
      `UPDATE carpetas SET activo = false WHERE id = $1 RETURNING id`,
      [id]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Carpeta no encontrada' });
    }
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar la carpeta' });
  }
});

module.exports = router;