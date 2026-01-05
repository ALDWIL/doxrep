const { query } = require('./utils/db');
const jwt = require('jsonwebtoken');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.AUTH_SECRET);

    const result = await query(
      `SELECT subscription_status, plan_type, trial_ends_at, expires_at
       FROM subscriptions 
       WHERE user_id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          subscription_status: 'none',
          trial_expired: false
        })
      };
    }

    const subscription = result.rows[0];
    const trialExpired = subscription.plan_type === 'trial' && 
                        subscription.trial_ends_at && 
                        new Date(subscription.trial_ends_at) <= new Date();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        subscription_status: subscription.subscription_status,
        plan_type: subscription.plan_type,
        trial_expired: trialExpired,
        expires_at: subscription.expires_at
      })
    };
  } catch (error) {
    console.error('Check subscription error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to check subscription' })
    };
  }
};


