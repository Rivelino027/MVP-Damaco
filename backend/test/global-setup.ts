import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';

export default async function globalSetup() {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });

  const testDbUrl =
    process.env.DATABASE_URL_TEST ||
    'mysql://root@127.0.0.1:3306/budgetflow_test';

  process.env.DATABASE_URL = testDbUrl;
  const backendDir = path.resolve(__dirname, '..');

  console.log(
    '\n[E2E Global Setup] Menyiapkan migrasi pada database pengujian:',
    testDbUrl,
  );

  // Jalankan prisma migrate deploy khusus ke database tes jika diaktifkan secara eksplisit
  if (process.env.RUN_MIGRATE_DEPLOY === 'true') {
    execSync('npx prisma migrate deploy', {
      cwd: backendDir,
      env: { ...process.env, DATABASE_URL: testDbUrl },
      stdio: 'inherit',
    });
  }

  // Jalankan seed awal ke database tes
  execSync('npx prisma db seed', {
    cwd: backendDir,
    env: { ...process.env, DATABASE_URL: testDbUrl },
    stdio: 'inherit',
  });
}
