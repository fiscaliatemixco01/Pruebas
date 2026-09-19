// Crea un usuario administrador para poder iniciar sesión la primera vez.
// Uso:
//   node scripts/crear-admin.js admin@fgemorelos.gob.mx MiClaveSegura "Ada" "Lovelace"
import "dotenv/config";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";

async function main() {
  const [usuario, contrasena, nombre = "Admin", apellidos = "FGE"] = process.argv.slice(2);

  if (!usuario || !contrasena) {
    console.error('Uso: node scripts/crear-admin.js "usuario" "contrasena" ["Nombre"] ["Apellidos"]');
    process.exit(1);
  }

  const hash = await bcrypt.hash(contrasena, 10);
  const { rows } = await pool.query(
    `insert into usuarios (usuario, contrasena_hash, nombre, apellidos, rol)
     values ($1, $2, $3, $4, 'Administrador')
     on conflict (usuario) do update set contrasena_hash = excluded.contrasena_hash
     returning id, usuario, nombre, apellidos, rol`,
    [usuario, hash, nombre, apellidos]
  );

  console.log("Usuario listo:", rows[0]);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
