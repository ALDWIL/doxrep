const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

async function sendVerificationEmail(email, code) {
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Your Doxreporter Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">Doxreporter Verification Code</h2>
        <p>Your verification code is:</p>
        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e40af; border-radius: 8px; margin: 20px 0;">
          ${code}
        </div>
        <p style="color: #6b7280;">This code will expire in 10 minutes.</p>
        <p style="color: #6b7280; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
}

async function sendIncidentReport(email, gcsUrl, incidentData) {
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Cyber Incident Report - Blockchain Link',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">Cyber Incident Report Submitted</h2>
        <p>Your incident report has been securely stored on the blockchain.</p>
        <div style="background-color: #eff6ff; padding: 15px; border-left: 4px solid #3b82f6; margin: 20px 0;">
          <strong>Incident Type:</strong> ${incidentData.incident_type}<br>
          <strong>Severity:</strong> ${incidentData.severity}<br>
          <strong>Timestamp:</strong> ${new Date(incidentData.timestamp).toLocaleString()}
        </div>
        <p><strong>Blockchain Verification Link:</strong></p>
        <a href="${gcsUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">
          View Incident Report
        </a>
        <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">This link provides immutable proof of your incident report.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
}

module.exports = { sendVerificationEmail, sendIncidentReport };
