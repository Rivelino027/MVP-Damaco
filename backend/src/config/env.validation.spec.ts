import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const validSecret32 = '12345678901234567890123456789012';

  it('harus berhasil jika semua konfigurasi valid', () => {
    const result = validateEnv({
      DATABASE_URL: 'mysql://root@127.0.0.1:3306/budgetflow',
      JWT_ACCESS_SECRET: validSecret32,
      JWT_REFRESH_SECRET: validSecret32,
      PORT: '3000',
    });

    expect(result.DATABASE_URL).toBe('mysql://root@127.0.0.1:3306/budgetflow');
    expect(result.JWT_ACCESS_SECRET).toBe(validSecret32);
    expect(result.JWT_REFRESH_SECRET).toBe(validSecret32);
    expect(result.PORT).toBe(3000);
  });

  it('harus melempar error jika DATABASE_URL kosong', () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: '',
        JWT_ACCESS_SECRET: validSecret32,
        JWT_REFRESH_SECRET: validSecret32,
      }),
    ).toThrow('DATABASE_URL wajib diisi');
  });

  it('harus melempar error jika JWT_ACCESS_SECRET kurang dari 32 karakter', () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: 'mysql://root@127.0.0.1:3306/budgetflow',
        JWT_ACCESS_SECRET: 'pendek',
        JWT_REFRESH_SECRET: validSecret32,
      }),
    ).toThrow('JWT_ACCESS_SECRET minimal harus 32 karakter');
  });

  it('harus melempar error jika JWT_REFRESH_SECRET kurang dari 32 karakter', () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: 'mysql://root@127.0.0.1:3306/budgetflow',
        JWT_ACCESS_SECRET: validSecret32,
        JWT_REFRESH_SECRET: 'terlalu_pendek_kurang_dari_32',
      }),
    ).toThrow('JWT_REFRESH_SECRET minimal harus 32 karakter');
  });

  it('harus menggunakan default port 3000 jika PORT tidak ditentukan', () => {
    const result = validateEnv({
      DATABASE_URL: 'mysql://root@127.0.0.1:3306/budgetflow',
      JWT_ACCESS_SECRET: validSecret32,
      JWT_REFRESH_SECRET: validSecret32,
    });
    expect(result.PORT).toBe(3000);
  });
});
