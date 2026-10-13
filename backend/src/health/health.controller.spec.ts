import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prismaService: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    prismaService = {
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('harus terdefinisi', () => {
    expect(controller).toBeDefined();
  });

  it('harus mengembalikan status 200 dan connected saat database terhubung', async () => {
    prismaService.$queryRaw.mockResolvedValueOnce([{ '1': 1 }]);

    const jsonMock = jest.fn();
    const resMock = {
      status: jest.fn().mockReturnValue({ json: jsonMock }),
    } as unknown as Response;

    await controller.check(resMock);

    expect(prismaService.$queryRaw).toHaveBeenCalled();
    expect(resMock.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ok',
        database: { status: 'connected' },
      }),
    );
  });

  it('harus mengembalikan status 503 saat koneksi database gagal', async () => {
    prismaService.$queryRaw.mockRejectedValueOnce(
      new Error('Connection refused'),
    );

    const jsonMock = jest.fn();
    const resMock = {
      status: jest.fn().mockReturnValue({ json: jsonMock }),
    } as unknown as Response;

    await controller.check(resMock);

    expect(prismaService.$queryRaw).toHaveBeenCalled();
    expect(resMock.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        database: {
          status: 'disconnected',
          error: 'Connection refused',
        },
      }),
    );
  });
});
