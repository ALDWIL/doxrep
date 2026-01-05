const { query } = require('./utils/db');
const jwt = require('jsonwebtoken');

// Promo code validation regex
// 'p' = trial (1 month), 'n' = lifetime
// 3 consonants, 2 vowels, 2 digits, 1 symbol
function validatePromoCodeFormat(code) {
  if (code.length < 8 || code.length > 16) return false;

  const lowerCode = code.toLowerCase();
  const consonants = lowerCode.match(/[bcdfghjklmnpqrstvwxz]/g) || [];
  const hasP = lowerCode.includes('p');
  const hasN = lowerCode.includes('n');
  const vowels = lowerCode.match(/[aeiou]/g) || [];
  const digits = code.match(/[0-9]/g) || [];
  const symbols = code.match(/[!@#$%&*?]/g) || [];

  return consonants.length >= 3 && (hasP || hasN) && vowels.length >= 2 &&
         digits.length >= 2 && symbols.length >= 1;
}

function isTrialPromoCode(code) {
  return code.toLowerCase().includes('p');
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
        body: JSON.stringify({ error: 'Code not valid' })
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
        body: JSON.stringify({ error: 'Code not valid' })
      };
    }

    const promo = result.rows[0];
    const isTrial = isTrialPromoCode(promoCode);

    // Update subscription based on promo type
    if (isTrial) {
      // Trial promo: 1 month free trial
      await query(
        `INSERT INTO subscriptions (user_id, subscription_status, plan_type, promo_code_used, trial_ends_at)
         VALUES ($1, 'trial', 'trial', $2, NOW() + INTERVAL '1 month')
         ON CONFLICT (user_id) DO UPDATE SET
           subscription_status = 'trial',
           plan_type = 'trial',
           promo_code_used = $2,
           started_at = NOW(),
           trial_ends_at = NOW() + INTERVAL '1 month',
           expires_at = NULL,
           updated_at = NOW()`,
        [decoded.userId, promoCode]
      );
    } else {
      // Lifetime promo: indefinite access
      await query(
        `INSERT INTO subscriptions (user_id, subscription_status, plan_type, promo_code_used)
         VALUES ($1, 'active', 'premium', $2)
         ON CONFLICT (user_id) DO UPDATE SET
           subscription_status = 'active',
           plan_type = 'premium',
           promo_code_used = $2,
           started_at = NOW(),
           expires_at = NULL,
           trial_ends_at = NULL,
           updated_at = NOW()`,
        [decoded.userId, promoCode]
      );
    }

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
        isTrial: isTrial,
        message: isTrial
          ? 'Promo code applied! You now have a 1-month free trial.'
          : 'Promo code applied successfully! You now have Premium access.'
      }),
    };
  } catch (error) {
    console.error('Promo validation error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Code not valid' }),
    };
  }
};