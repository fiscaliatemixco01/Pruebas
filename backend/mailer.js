const nodemailer = require('nodemailer');

// Por defecto usa Gmail (smtp.gmail.com, puerto 465 con SSL), igual que antes.
// Si el firewall/antivirus bloquea ese puerto, se puede cambiar SIN tocar el código, en backend/.env:
//   SMTP_HOST=smtp.gmail.com
//   SMTP_PORT=587          (587 usa STARTTLS; 465 usa SSL directo)
// Con otro servidor (por ejemplo el correo institucional) basta con cambiar SMTP_HOST y SMTP_PORT.
const host = process.env.SMTP_HOST || 'smtp.gmail.com';
const port = Number(process.env.SMTP_PORT) || 465;

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Si la red bloquea la conexión, falla en pocos segundos en vez de quedarse esperando
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

async function enviarCorreoCodigo(destinatario, codigo) {
  try {
    await transporter.sendMail({
      from: `"Fiscalía General del Estado de Morelos" <${process.env.EMAIL_USER}>`,
      to: destinatario,
      subject: 'Código de verificación',
      text: `Tu código de verificación es: ${codigo}\n\nExpira en 10 minutos.`,
    });
  } catch (error) {
    // Deja en la consola del servidor la causa real (ETIMEDOUT = puerto bloqueado,
    // ESOCKET/self-signed = antivirus que intercepta el cifrado, EAUTH = contraseña de aplicación)
    console.error(`[correo] No se pudo enviar vía ${host}:${port} — ${error.code || 'sin código'}: ${error.message}`);
    throw error;
  }
}

module.exports = { enviarCorreoCodigo };