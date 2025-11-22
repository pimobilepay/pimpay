import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOtpEmail(to: string, otp: string, transferId: string) {
  const from = process.env.FROM_EMAIL || process.env.SMTP_USER;
  const html = `
    <h3>PIMPAY — Code OTP</h3>
    <p>Votre code OTP pour valider le transfert <strong>${transferId}</strong> est :</p>
    <h2>${otp}</h2>
    <p>Il expire dans 10 minutes.</p>
  `;

  await transporter.sendMail({
    from,
    to,
    subject: `PIMPAY — Code OTP pour transfert ${transferId}`,
    html,
  });
}
