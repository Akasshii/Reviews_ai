import app from './app';
import { pool } from './infrastructure/database/db';

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✓ Database connected successfully');

    app.listen(PORT, () => {
      console.log(`✓ Server is running on port ${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ API URL: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
