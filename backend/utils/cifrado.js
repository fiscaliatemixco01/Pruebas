const crypto = require('crypto');

const ALGORITMO = 'aes-256-gcm';

function obtenerLlave() {
  const hex = process.env.PASSWORD_ENCRYPTION_KEY;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      'PASSWORD_ENCRYPTION_KEY no está configurada o no tiene 64 caracteres hexadecimales'
    );
  }
  return Buffer.from(hex, 'hex');
}

// Devuelve "iv:tag:cifrado" (todo en hex). Cada cifrado usa un IV nuevo.
function cifrar(textoPlano) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITMO, obtenerLlave(), iv);
  const cifrado = Buffer.concat([cipher.update(String(textoPlano), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('hex'), tag.toString('hex'), cifrado.toString('hex')].join(':');
}

function descifrar(valor) {
  const [ivHex, tagHex, datosHex] = String(valor).split(':');
  const decipher = crypto.createDecipheriv(ALGORITMO, obtenerLlave(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const plano = Buffer.concat([decipher.update(Buffer.from(datosHex, 'hex')), decipher.final()]);
  return plano.toString('utf8');
}

module.exports = { cifrar, descifrar };