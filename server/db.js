/**
 * PostgreSQL Database Connection Module
 * Connects to PostgreSQL using pg pool. Supports pgAdmin inspection.
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'netzero_pet_db',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000
});

// Test connection on boot
let isConnected = false;

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.warn('⚠️ [PostgreSQL]: Database connection not active yet. Using In-Memory fallback store.');
    console.warn('💡 [Tip for pgAdmin]: Run database/schema.sql and database/seed.sql in pgAdmin 4, then configure .env');
    isConnected = false;
  } else {
    console.log('✅ [PostgreSQL]: Connected successfully to database:', process.env.DB_NAME || 'netzero_pet_db');
    isConnected = true;
  }
});

module.exports = {
  pool,
  isDbConnected: () => isConnected
};
