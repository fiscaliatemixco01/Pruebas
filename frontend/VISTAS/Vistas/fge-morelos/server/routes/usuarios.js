import { Router } from "express";
import { pool } from "../db.js";

export const usuariosRouter = Router();

usuariosRouter.get("/", async (req, res) => {
  const { rows } = await pool.query(
    "select id, nombre, apellidos, rol, materia from usuarios order by nombre"
  );
  res.json(rows);
});
