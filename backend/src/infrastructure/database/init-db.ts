import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from './db';

const initDatabase = async () => {
  try {
    console.log('Initializing database...');

    const schemaSQL = readFileSync(
      join(__dirname, 'schema.sql'),
      'utf-8'
    );

    await pool.query(schemaSQL);

    console.log('✓ Database schema created successfully');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
};

initDatabase();
