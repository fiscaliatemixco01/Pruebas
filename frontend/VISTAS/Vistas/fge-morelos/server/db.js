import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

// Toma la configuración de conexión de tu .env local. Ajusta estos valores
// a los de TU instalación de Postgres (los que usas en pgAdmin / psql).
export const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "postgres",
  database: process.env.PGDATABASE || "fge_morelos",
});

pool.on("error", (err) => {
  console.error("Error inesperado en el pool de Postgres:", err);
});
