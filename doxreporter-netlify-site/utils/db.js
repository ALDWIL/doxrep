const { neon } = require('@neondatabase/serverless');

// Initialize Neon SQL client
const sql = neon(process.env.DATABASE_URL);

async function query(text, params) {
  try {
    console.log('Executing query:', text);
    console.log('With params:', params);
    
    // Neon uses template literals, convert parameterized query
    if (params && params.length > 0) {
      // For parameterized queries, we need to handle them differently
      const parameterizedQuery = text.replace(/\$(\d+)/g, (match, number) => {
        const index = parseInt(number) - 1;
        const value = params[index];
        if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
        if (value instanceof Date) return `'${value.toISOString()}'`;
        if (value === null) return 'NULL';
        if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
        return value;
      });
      
      const result = await sql(parameterizedQuery);
      console.log('Query executed successfully, rows:', result.length);
      return { rows: result };
    }
    
    const result = await sql(text);
    console.log('Query executed successfully, rows:', result.length);
    return { rows: result };
  } catch (error) {
    console.error('Database query error:', error);
    console.error('Query was:', text);
    console.error('Params were:', params);
    throw error;
  }
}

module.exports = { query, sql };