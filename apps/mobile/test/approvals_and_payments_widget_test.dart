import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:damacoflow/features/approvals/data/repositories/approvals_repository_mock.dart';
import 'package:damacoflow/features/approvals/presentation/pages/approvals_page.dart';
import 'package:damacoflow/features/approvals/presentation/pages/payments_page.dart';
import 'package:damacoflow/features/approvals/presentation/providers/approvals_provider.dart';
import 'package:damacoflow/features/auth/domain/entities/user_entity.dart';
import 'package:damacoflow/features/auth/presentation/providers/auth_provider.dart';

void main() {
  // Shared mock repository untuk semua test di file ini
  final mockApprovalsRepo = ApprovalsRepositoryMock();

  testWidgets('ApprovalsPage merender judul, filter chips, dan kartu antrean', (tester) async {
    const adminUser = UserEntity(
      id: 'usr-002',
      name: 'Ransink',
      email: 'ransink@damacoflow.id',
      role: 'admin',
      departmentName: 'Departemen IT',
      costCenterCode: 'CC-IT-02',
      costCenterName: 'Infrastruktur & Jaringan',
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          currentUserProvider.overrideWithValue(adminUser),
          approvalsRepositoryProvider.overrideWithValue(mockApprovalsRepo),
        ],
        child: const MaterialApp(
          home: ApprovalsPage(),
        ),
      ),
    );

    // Initial pump
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    // Verifikasi Header & filter
    expect(find.text('Persetujuan'), findsOneWidget);
    expect(find.text('Semua'), findsOneWidget);
    expect(find.text('Pengeluaran'), findsWidgets);
    expect(find.text('Timesheet'), findsWidgets);
    expect(find.text('Anggaran'), findsOneWidget);
  });

  testWidgets('PaymentsPage merender judul Pembayaran dan daftar pengeluaran siap dibayar', (tester) async {
    const financeUser = UserEntity(
      id: 'usr-003',
      name: 'Mamas',
      email: 'mamas@damacoflow.id',
      role: 'finance',
      departmentName: 'Departemen Keuangan',
      costCenterCode: 'CC-FIN-01',
      costCenterName: 'Operasional Keuangan',
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          currentUserProvider.overrideWithValue(financeUser),
          approvalsRepositoryProvider.overrideWithValue(mockApprovalsRepo),
        ],
        child: const MaterialApp(
          home: PaymentsPage(),
        ),
      ),
    );

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    // Verifikasi Header
    expect(find.text('Pembayaran'), findsOneWidget);
    // Verifikasi ada tombol Tandai Dibayar
    expect(find.text('Tandai Dibayar'), findsWidgets);
  });
}
