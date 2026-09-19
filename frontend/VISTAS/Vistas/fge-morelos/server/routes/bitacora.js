import { Router } from "express";
import { pool } from "../db.js";

export const bitacoraRouter = Router();

bitacoraRouter.get("/", async (req, res) => {
  const { numero_llamado, fecha } = req.query;
  const clauses = [];
  const values = [];

  if (numero_llamado) {
    values.push(`%${numero_llamado}%`);
    clauses.push(`b.numero_llamado ilike $${values.length}`);
  }
  if (fecha) {
    values.push(fecha);
    clauses.push(`b.fecha = $${values.length}`);
  }

  const where = clauses.length ? `where ${clauses.join(" and ")}` : "";
  const { rows } = await pool.query(
    `select b.id, b.numero_llamado, b.fecha, b.hora, b.modificacion,
            coalesce(u.nombre || ' ' || u.apellidos, b.realizado_por) as realizado_por
     from bitacora b
     left join usuarios u on u.id::text = b.realizado_por
     ${where}
     order by b.fecha desc, b.hora desc
     limit 200`,
    values
  );
  res.json(rows);
});
