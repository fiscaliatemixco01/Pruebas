# FGE Morelos — Registro de peticiones (frontend)

Proyecto React (Vite) que implementa las pantallas del wireframe a partir de la
página 4: inicio, registro de petición (2 pasos), buscar, editar, bitácora y
usuarios.

## Ver las pantallas sin backend (modo demo)

Si solo quieres navegar las vistas ya mismo, sin levantar Postgres ni el
backend:

```bash
npm install
cp .env.example .env
```

En ese `.env`, cambia:

```
VITE_DEMO_MODE=true
```

```bash
npm run dev
```

Abre `http://localhost:5173`: el login se salta solo (entras como un
usuario "Demo / Administrador") y puedes recorrer todas las pantallas. Las
que dependen de datos (Buscar, Bitácora, Usuarios, los `<select>` de perito
y materia) se van a ver vacías porque no hay backend respondiendo — es
esperado, es solo para revisar la interfaz. Cuando quieras conectarlo de
verdad, pon `VITE_DEMO_MODE=false` (o bórralo) y sigue la sección de abajo.

## Cómo correrlo (frontend + backend + tu Postgres local)

Este repo trae dos partes: el frontend (`/`, este React) y un backend listo
para usar (`/server`) que se conecta a tu Postgres local. Necesitas correr
ambos al mismo tiempo, en dos terminales.

**1. Prepara la base de datos** (una sola vez):

```bash
createdb fge_morelos                       # o créala desde pgAdmin
psql -d fge_morelos -f server/schema.sql   # crea las tablas
```

**2. Levanta el backend** (terminal 1):

```bash
cd server
npm install
cp .env.example .env
# abre .env y pon TUS datos reales de conexión a Postgres:
#   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
npm run dev
```

Crea un usuario para poder iniciar sesión la primera vez:

```bash
node scripts/crear-admin.js "admin@fge.gob.mx" "MiClaveSegura123" "Ada" "Lovelace"
```

El backend queda escuchando en `http://localhost:4000`.

**3. Levanta el frontend** (terminal 2, en la raíz del proyecto):

```bash
npm install
cp .env.example .env     # por defecto ya apunta a http://localhost:4000/api
npm run dev
```

Abre `http://localhost:5173`, inicia sesión con el usuario que creaste, y ya
estarás usando el sitio conectado a tu Postgres local.

## Cómo se conecta a Postgres

Este frontend **no** habla directo con Postgres (nunca deberías exponer tu
base de datos al navegador). Habla por HTTP/JSON con el backend incluido en
`/server` (Express + `pg`), y ese backend es el que ejecuta las queries
contra tu Postgres local. Si ya tienes tu propio backend (Node, Django,
FastAPI, etc.) puedes ignorar `/server` y solo apuntar `VITE_API_URL` al
tuyo, siempre que exponga los mismos endpoints.

Toda la comunicación pasa por `src/api/client.js`, que usa la variable de
entorno `VITE_API_URL`. Los demás archivos en `src/api/` (`auth.js`,
`peticiones.js`, `bitacora.js`, `usuarios.js`) documentan, en comentarios,
exactamente qué endpoints REST espera cada pantalla:

| Pantalla | Endpoints esperados |
|---|---|
| Login / Crear cuenta | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/registro` |
| Registrar petición (paso 1) | `POST /peticiones` — crea el registro y regresa `numero_llamado`, `fecha`, `hora` autogenerados |
| Registrar petición (paso 2) | `PUT /peticiones/:id` — agrega perito, firma y tipo de entrega |
| Buscar | `GET /peticiones?numero_llamado=&perito=&fecha=` |
| Editar | `GET /peticiones?numero_llamado=`, luego `PUT /peticiones/:id` |
| Bitácora | `GET /bitacora` |
| Usuarios | `GET /usuarios` |
| Catálogos de los `<select>` | `GET /peritos`, `GET /materias` |

El esquema completo de tablas está en `server/schema.sql` (usuarios,
peticiones, bitácora, materias). El backend incluido ya inserta una fila en
`bitacora` cada vez que se crea o actualiza una petición.

## Estructura

```
src/
  api/            funciones que llaman a tu backend (fetch)
  context/        AuthContext (usuario en sesión)
  components/     AppLayout (header + sidebar), Field.jsx, ProtectedRoute
  pages/
    Login.jsx, CrearCuenta.jsx        pantallas de acceso
    Home.jsx                          bienvenida (página 4)
    PeticionWizard.jsx                formulario de 2 pasos reutilizable (páginas 5-6)
    NuevaPeticion.jsx                 "Registrar petición"
    BuscarPeticion.jsx                "Buscar" (página 7)
    EditarPeticion.jsx                "Editar": busca y reutiliza el wizard
    Bitacora.jsx                      página 8
    Usuarios.jsx                      página 9
  styles/         tokens.css (colores/tipografía), ui.css (botones, tarjetas, tablas)

server/
  index.js            arranca Express, monta las rutas y la sesión de login
  db.js               pool de conexión a Postgres (lee PGHOST/PGUSER/... de .env)
  schema.sql           tablas: usuarios, peticiones, bitacora, materias
  scripts/crear-admin.js  crea un usuario para poder iniciar sesión la primera vez
  routes/
    auth.js           login, logout, sesión activa, registro de cuenta
    peticiones.js     crear/actualizar/buscar peticiones + catálogos de perito/materia
    bitacora.js       listado de movimientos
    usuarios.js       listado de usuarios
```

## Notas / pendientes para ti

- El botón **Registro biométrico** en "Crear cuenta" solo simula el paso;
  ahí se conectaría el SDK de tu lector/cámara biométrica.
- El **rol** del usuario en sesión (`user.rol`) está disponible vía
  `useAuth()` si necesitas ocultar/mostrar botones del sidebar según el rol
  (por ejemplo, que "Usuarios" solo lo vea un Administrador).
- Ajusta los catálogos de `Llamado` y `Materia` en `PeticionWizard.jsx` si
  tus valores reales en Postgres son distintos a los de ejemplo.
