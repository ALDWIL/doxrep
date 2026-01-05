const { query } = require('./utils/db');
const { uploadIncidentData } = require('./utils/gcs');
const { sendIncidentReport } = require('./utils/email');
const jwt = require('jsonwebtoken');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Verify session token
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.AUTH_SECRET);

    const incidentData = JSON.parse(event.body);

    // Upload to Google Cloud Storage (NOT to Neon)
    const gcsUrl = await uploadIncidentData({
      ...incidentData,
      user_id: decoded.userId,
    });

    // Store only metadata in Neon
    await query(
      `INSERT INTO incident_logs (user_id, gcs_url, incident_type, severity, timestamp)
       VALUES ($1, $2, $3, $4, $5)`,
      [decoded.userId, gcsUrl, incidentData.incident_type, incidentData.severity, incidentData.timestamp]
    );

    // Get user's subscription emails
    const emailsResult = await query(
      'SELECT recipient_email FROM subscription_emails WHERE user_id = $1',
      [decoded.userId]
    );

    // Send emails to all recipients
    const emailPromises = emailsResult.rows.map((row) =>
      sendIncidentReport(row.recipient_email, gcsUrl, incidentData)
    );
    await Promise.all(emailPromises);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        gcsUrl,
        message: 'Incident report created and stored on blockchain',
      }),
    };
  } catch (error) {
    console.error('Create incident error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create incident' }),
    };
  }
};
