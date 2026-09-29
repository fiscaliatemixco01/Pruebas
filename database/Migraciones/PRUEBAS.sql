-- Tabla de roles
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    nom_rol VARCHAR(100) NOT NULL UNIQUE
);

-- Tabla de acciones
CREATE TABLE acciones (
    id SERIAL PRIMARY KEY,
    nom_accion VARCHAR(100) NOT NULL UNIQUE
);

-- Tabla de usuarios
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    correo VARCHAR(150) UNIQUE NOT NULL,
    rol_id INTEGER NOT NULL,

    -- Autenticación por correo
    password_hash TEXT,
    verificado BOOLEAN NOT NULL DEFAULT FALSE,
    token_hash TEXT,
    token_expira TIMESTAMPTZ,

    CONSTRAINT fk_usuarios_rol
        FOREIGN KEY (rol_id)
        REFERENCES roles(id)
        ON DELETE RESTRICT
);

-- Tabla de bitácora
CREATE TABLE bitacora (
    id SERIAL PRIMARY KEY,
    us_id INTEGER NOT NULL,
    acc_id INTEGER NOT NULL,
    pet_id BIGINT,  -- Referencia compatible con BIGSERIAL de Peticiones
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_bitacora_usuario
        FOREIGN KEY (us_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_bitacora_accion
        FOREIGN KEY (acc_id)
        REFERENCES acciones(id)
        ON DELETE RESTRICT

    -- Descomentar si ambas BD se ejecutan en el mismo script:
    -- , CONSTRAINT fk_bitacora_peticion
    --     FOREIGN KEY (pet_id)
    --     REFERENCES peticiones(id)
    --     ON DELETE SET NULL
);

CREATE INDEX idx_bitacora_usuario_fecha ON bitacora(us_id, fecha_hora DESC);

-- Datos iniciales
INSERT INTO roles (nom_rol) VALUES
    ('Administrador'),
    ('Receptor'),
    ('Perito');

INSERT INTO acciones (nom_accion) VALUES
    ('Inicio de sesión'),
    ('Cierre de sesión'),
    ('Crear petición'),
    ('Actualizar petición'),
    ('Crear usuario'),
    ('Actualizar usuario');

-- Usuario administrador de prueba (sin contraseña todavía, ver nota abajo)
INSERT INTO usuarios (nombre, correo, rol_id, verificado)
VALUES ('Prueba Admin', 'admin@test.com', 1, TRUE);

-- Verificar
SELECT * FROM roles;
SELECT * FROM acciones;
SELECT * FROM usuarios;
SELECT * FROM bitacora;




ALTER TABLE peticiones ALTER COLUMN entrega_dictamen DROP NOT NULL;
ALTER TABLE peticiones ALTER COLUMN entrega_informe DROP NOT NULL;


SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'peticiones';


ALTER TABLE peticiones ALTER COLUMN entrega_dictamen DROP NOT NULL;
ALTER TABLE peticiones ALTER COLUMN entrega_informe DROP NOT NULL;
-- Agrega aquí cualquier otra columna que se llene hasta una etapa posterior


ALTER TABLE peticiones ALTER COLUMN entrega_dictamen DROP NOT NULL;
ALTER TABLE peticiones ALTER COLUMN entrega_informe DROP NOT NULL;
ALTER TABLE peticiones ALTER COLUMN entrega_requerimiento DROP NOT NULL;

-- Nuevo rol
INSERT INTO roles (nom_rol) VALUES ('Consulta');

-- Relación perito -> materia
ALTER TABLE usuarios ADD COLUMN materia_id INTEGER REFERENCES materias(id);

-- Tabla de verificación de correo (independiente de usuarios)
CREATE TABLE verificaciones_correo (
    id SERIAL PRIMARY KEY,
    correo VARCHAR(150) NOT NULL,
    token_hash TEXT NOT NULL,
    token_expira TIMESTAMPTZ NOT NULL,
    verificado BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE carpetas (
    id SERIAL PRIMARY KEY,
    numero_carpeta VARCHAR(50) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);