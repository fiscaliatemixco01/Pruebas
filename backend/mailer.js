const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function enviarCorreoCodigo(destinatario, codigo) {
  await transporter.sendMail({
    from: `"Fiscalía General del Estado de Morelos" <${process.env.EMAIL_USER}>`,
    to: destinatario,
    subject: 'Código de verificación',
    text: `Tu código de verificación es: ${codigo}\n\nExpira en 10 minutos.`,
  });
}

module.exports = { enviarCorreoCodigo };