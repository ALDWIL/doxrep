const nodemailer = require('nodemailer');

// Configure Postmark SMTP transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.postmarkapp.com',
  port: 587,
  secure: false, // Use STARTTLS
  auth: {
    user: process.env.POSTMARK_SERVER_TOKEN,
    pass: process.env.POSTMARK_SERVER_TOKEN, // Postmark uses token for both
  },
  tls: {
    ciphers: 'SSLv3',
  },
});

// Verify transporter configuration on startup
transporter.verify(function (error, success) {
  if (error) {
    console.error('SMTP transporter verification failed:', error);
  } else {
    console.log('SMTP transporter is ready to send emails');
  }
});

async function sendVerificationEmail(email, code) {
  const mailOptions = {
    from: process.env.SMTP_FROM || 'admin@roen.solutions',
    to: email,
    subject: 'Your Doxreporter Verification Code',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h1 style="color: #1e40af; margin: 0 0 20px 0; font-size: 24px; text-align: center;">Doxreporter Verification Code</h1>
                      <p style="color: #374151; margin: 0 0 20px 0; font-size: 16px; text-align: center;">Your verification code is:</p>
                      <div style="background-color: #eff6ff; padding: 20px; text-align: center; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1e40af; border-radius: 8px; margin: 20px 0; font-family: 'Courier New', monospace;">
                        ${code}
                      </div>
                      <p style="color: #6b7280; margin: 20px 0 0 0; font-size: 14px; text-align: center;">This code will expire in 5 minutes.</p>
                      <p style="color: #9ca3af; margin: 20px 0 0 0; font-size: 12px; text-align: center;">If you didn't request this code, please ignore this email.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
                      <p style="color: #6b7280; margin: 0; font-size: 12px; text-align: center;">
                        © 2025 Doxreporter - Cyber Incident Reporting
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: `Your Doxreporter verification code is: ${code}\n\nThis code will expire in 5 minutes.\n\nIf you didn't request this code, please ignore this email.`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    console.log('Accepted:', info.accepted);
    console.log('Response:', info.response);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    console.error('Error code:', error.code);
    console.error('Error response:', error.response);
    throw error;
  }
}

async function sendIncidentReport(email, gcsUrl, incidentData) {
  const mailOptions = {
    from: process.env.SMTP_FROM || 'admin@roen.solutions',
    to: email,
    subject: 'Cyber Incident Report - Blockchain Link',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h1 style="color: #1e40af; margin: 0 0 20px 0; font-size: 24px;">Cyber Incident Report Submitted</h1>
                      <p style="color: #374151; margin: 0 0 20px 0; font-size: 16px;">Your incident report has been securely stored on the blockchain.</p>
                      <div style="background-color: #eff6ff; padding: 15px; border-left: 4px solid #3b82f6; margin: 20px 0;">
                        <p style="margin: 5px 0; color: #1e40af;"><strong>Incident Type:</strong> ${incidentData.incident_type}</p>
                        <p style="margin: 5px 0; color: #1e40af;"><strong>Severity:</strong> ${incidentData.severity}</p>
                        <p style="margin: 5px 0; color: #1e40af;"><strong>Timestamp:</strong> ${new Date(incidentData.timestamp).toLocaleString()}</p>
                      </div>
                      <p style="color: #374151; margin: 20px 0; font-size: 16px;"><strong>Blockchain Verification Link:</strong></p>
                      <div style="text-align: center; margin: 20px 0;">
                        <a href="${gcsUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                          View Incident Report
                        </a>
                      </div>
                      <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">This link provides immutable proof of your incident report.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
                      <p style="color: #6b7280; margin: 0; font-size: 12px; text-align: center;">
                        © 2025 Doxreporter - Cyber Incident Reporting
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: `Your incident report has been submitted.\n\nIncident Type: ${incidentData.incident_type}\nSeverity: ${incidentData.severity}\nTimestamp: ${new Date(incidentData.timestamp).toLocaleString()}\n\nBlockchain Verification Link: ${gcsUrl}\n\nThis link provides immutable proof of your incident report.`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Incident report email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Incident report email error:', error);
    throw error;
  }
}

module.exports = { sendVerificationEmail, sendIncidentReport };