const { query } = require('./utils/db');
const { sendVerificationEmail } = require('./utils/email');

exports.handler = async (event) => {
  // CORS headers for all responses
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    console.log('Received request to send verification code');
    
    const { email } = JSON.parse(event.body);

    // Validate email format
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.error('Invalid email format:', email);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Invalid email address' 
        }),
      };
    }

    console.log('Processing verification code for email:', email);

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes (matching frontend config)

    console.log('Generated verification code:', code, 'Expires at:', expiresAt);

    // Store code in database
    try {
      await query(
        'INSERT INTO verification_codes (email, code, expires_at, used) VALUES ($1, $2, $3, $4)',
        [email, code, expiresAt, false]
      );
      console.log('Verification code stored in database successfully');
    } catch (dbError) {
      console.error('Database error storing verification code:', dbError);
      throw new Error('Failed to store verification code in database');
    }

    // Send email
    try {
      await sendVerificationEmail(email, code);
      console.log('Verification email sent successfully to:', email);
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      
      // Delete the stored code since email failed
      await query(
        'DELETE FROM verification_codes WHERE email = $1 AND code = $2',
        [email, code]
      );
      
      throw new Error('Failed to send verification email');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Verification code sent successfully' 
      }),
    };
  } catch (error) {
    console.error('Send code error:', error);
    console.error('Error stack:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Failed to send verification code',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }),
    };
  }
};