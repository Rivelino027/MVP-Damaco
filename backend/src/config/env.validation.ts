export interface EnvConfig {
  DATABASE_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  PORT: number;
}

export function validateEnv(
  config: Record<string, unknown> = process.env,
): EnvConfig {
  const errors: string[] = [];

  const dbUrl =
    typeof config.DATABASE_URL === 'string' ? config.DATABASE_URL.trim() : '';
  if (!dbUrl) {
    errors.push('DATABASE_URL wajib diisi (tidak boleh kosong).');
  }

  const accessSecret =
    typeof config.JWT_ACCESS_SECRET === 'string'
      ? config.JWT_ACCESS_SECRET.trim()
      : '';
  if (!accessSecret) {
    errors.push('JWT_ACCESS_SECRET wajib diisi.');
  } else if (accessSecret.length < 32) {
    errors.push(
      `JWT_ACCESS_SECRET minimal harus 32 karakter (saat ini ${accessSecret.length} karakter).`,
    );
  }

  const refreshSecret =
    typeof config.JWT_REFRESH_SECRET === 'string'
      ? config.JWT_REFRESH_SECRET.trim()
      : '';
  if (!refreshSecret) {
    errors.push('JWT_REFRESH_SECRET wajib diisi.');
  } else if (refreshSecret.length < 32) {
    errors.push(
      `JWT_REFRESH_SECRET minimal harus 32 karakter (saat ini ${refreshSecret.length} karakter).`,
    );
  }

  if (errors.length > 0) {
    const banner = [
      '======================================================================',
      ' [FATAL] GAGAL MEMULAI APLIKASI: Konfigurasi Environment Tidak Valid',
      '======================================================================',
      ...errors.map((err) => `  * ${err}`),
      '----------------------------------------------------------------------',
      ' Silakan periksa file .env dan pastikan semua variabel terisi benar.',
      '======================================================================',
    ].join('\n');
    throw new Error(banner);
  }

  const parsedPort =
    typeof config.PORT === 'string'
      ? parseInt(config.PORT, 10)
      : typeof config.PORT === 'number'
        ? config.PORT
        : 3000;

  return {
    DATABASE_URL: dbUrl,
    JWT_ACCESS_SECRET: accessSecret,
    JWT_REFRESH_SECRET: refreshSecret,
    PORT: Number.isNaN(parsedPort) ? 3000 : parsedPort,
  };
}
