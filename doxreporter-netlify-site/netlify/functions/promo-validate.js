const { query } = require('./utils/db');
const jwt = require('jsonwebtoken');

// Promo code validation regex
// 3 consonants (including 'n'), 2 vowels, 2 uppercase, 2 digits, 1 symbol
function validatePromoCodeFormat(code) {
  if (code.length !== 8) return false;
  
  const consonants = code.match(/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]/g) || [];
  const hasN = code.toLowerCase().includes('n');
  const vowels = code.match(/[aeiouAEIOU]/g) || [];
  const uppercase = code.match(/[A-Z]/g) || [];
  const digits = code.match(/[0-9]/g) || [];
  const symbols = code.match(/[!@#$%&*?]/g) || [];
  
  return consonants.length >= 3 && hasN && vowels.length >= 2 && 
         uppercase.length >= 2 && digits.length >= 2 && symbols.length >= 1;
}

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
    const { promoCode } = JSON.parse(event.body);

    // Validate format
    if (!validatePromoCodeFormat(promoCode)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid promo code format' })
      };
    }

    // Check if promo code exists and is valid
    const result = await query(
      `SELECT * FROM promo_codes 
       WHERE code = $1 AND is_active = TRUE AND 
       (expires_at IS NULL OR expires_at > NOW()) AND
       (max_uses IS NULL OR uses < max_uses)`,
      [promoCode]
    );

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Invalid or expired promo code' })
      };
    }

    const promo = result.rows[0];

    // Update subscription to premium
    await query(
      `INSERT INTO subscriptions (user_id, subscription_status, plan_type, promo_code_used)
       VALUES ($1, 'active', 'premium', $2)
       ON CONFLICT (user_id) DO UPDATE SET
         subscription_status = 'active',
         plan_type = 'premium',
         promo_code_used = $2,
         started_at = NOW(),
         expires_at = NOW() + INTERVAL '1 year',
         updated_at = NOW()`,
      [decoded.userId, promoCode]
    );

    // Increment promo code usage
    await query(
      'UPDATE promo_codes SET uses = uses + 1 WHERE code = $1',
      [promoCode]
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        message: 'Promo code applied successfully! You now have Premium access.'
      }),
    };
  } catch (error) {
    console.error('Promo validation error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to validate promo code' }),
    };
  }
};