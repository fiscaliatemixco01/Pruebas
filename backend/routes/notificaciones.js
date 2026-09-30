const express = require('express');
const pool = require('../db');
const { verificarToken } = require('../middleware/auth');

const router = express.Router();
router.use(verificarToken);

// ---------- MIS NOTIFICACIONES (las 30 más recientes) ----------
router.get('/', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, pet_id, tipo, mensaje, leida, creada_en
         FROM notificaciones
        WHERE us_id = $1
        ORDER BY creada_en DESC
        LIMIT 30`,
      [req.usuario.id]
    );
    res.json(r.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar las notificaciones' });
  }
});

// ---------- MARCAR TODAS COMO LEÍDAS (debe ir ANTES de /:id/leida) ----------
router.put('/leer-todas', async (req, res) => {
  try {
    await pool.query(
      'UPDATE notificaciones SET leida = TRUE WHERE us_id = $1 AND leida = FALSE',
      [req.usuario.id]
    );
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al marcar las notificaciones' });
  }
});

// ---------- MARCAR UNA COMO LEÍDA (solo si es del usuario logueado) ----------
router.put('/:id/leida', async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Id inválido' });

  try {
    await pool.query(
      'UPDATE notificaciones SET leida = TRUE WHERE id = $1 AND us_id = $2',
      [id, req.usuario.id]
    );
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al marcar la notificación' });
  }
});

module.exports = router;