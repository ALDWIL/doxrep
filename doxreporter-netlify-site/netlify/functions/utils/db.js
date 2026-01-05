const { Pool } = require('@neondatabase/serverless');

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      ssl: true
    });
  }
  return pool;
}

async function query(text, params) {
  const pool = getPool();
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

module.exports = { query, getPool };