const jwt = require('jsonwebtoken');
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

exports.handler = async (event) => {
  // Define standard headers for CORS support
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle CORS preflight request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { email, code } = JSON.parse(event.body);

    console.log('Verifying code for:', email);

    // Verify code from database
    // Using Neon's sql template literal for automatic parameterization
    const result = await sql`
      SELECT * FROM verification_codes 
      WHERE email = ${email} 
        AND code = ${code} 
        AND expires_at > NOW() 
        AND used = FALSE
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    if (result.length === 0) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Invalid or expired code' 
        }),
      };
    }

    // Mark code as used to prevent replay attacks
    await sql`
      UPDATE verification_codes 
      SET used = TRUE 
      WHERE id = ${result[0].id}
    `;

    // Get or create user
    let userResult = await sql`
      SELECT * FROM users WHERE email = ${email}
    `;

    let user;
    if (userResult.length === 0) {
      // Create new user if they don't exist
      const newUserResult = await sql`
        INSERT INTO users (email, email_verified, last_login)
        VALUES (${email}, NOW(), NOW())
        RETURNING *
      `;
      user = newUserResult[0];
      console.log('New user created:', user.id);
    } else {
      // Update existing user login timestamps
      await sql`
        UPDATE users 
        SET last_login = NOW(), email_verified = NOW()
        WHERE id = ${userResult[0].id}
      `;
      user = userResult[0];
      console.log('Existing user logged in:', user.id);
    }

    // Create session token (JWT)
    const sessionToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email 
      },
      process.env.AUTH_SECRET,
      { expiresIn: '30d' }
    );

    // Store session in the database
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await sql`
      INSERT INTO sessions (user_id, session_token, expires_at)
      VALUES (${user.id}, ${sessionToken}, ${expiresAt})
    `;

    console.log('Session created for user:', user.id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        user: { 
          id: user.id, 
          email: user.email 
        },
        sessionToken,
      }),
    };
  } catch (error) {
    console.error('Verify code error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Verification failed',
        details: error.message 
      }),
    };
  }
};