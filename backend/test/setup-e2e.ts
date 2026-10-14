import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const testDbUrl =
  process.env.DATABASE_URL_TEST ||
  'mysql://root@127.0.0.1:3306/budgetflow_test';

// Pastikan DATABASE_URL diarahkan ke database tes
process.env.DATABASE_URL = testDbUrl;
