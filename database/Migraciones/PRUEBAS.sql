-- Módulo 1: Autenticación por reconocimiento facial y bitácora

-- Tabla de roles 
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    nom_rol VARCHAR(100) NOT NULL UNIQUE
);

-- Tabla de datos biométricos  
CREATE TABLE biometricos (
    id SERIAL PRIMARY KEY,
    vector BYTEA NOT NULL  
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
    biom_id INTEGER UNIQUE,

    CONSTRAINT fk_usuarios_rol
        FOREIGN KEY (rol_id) 
        REFERENCES roles(id) 
        ON DELETE RESTRICT,

    CONSTRAINT fk_usuarios_biometrico
        FOREIGN KEY (biom_id) 
        REFERENCES biometricos(id) 
        ON DELETE SET NULL
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

-- Índice recomendado para mejorar el rendimiento de consultas a la bitácora
CREATE INDEX idx_bitacora_usuario_fecha ON bitacora(us_id, fecha_hora DESC);

