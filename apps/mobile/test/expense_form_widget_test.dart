import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:damacoflow/features/expenses/presentation/pages/expense_form_page.dart';

void main() {
  Widget createWidgetUnderTest() {
    return const ProviderScope(
      child: MaterialApp(
        home: ExpenseFormPage(),
      ),
    );
  }

  testWidgets('ExpenseFormPage menampilkan seluruh komponen formulir utama',
      (WidgetTester tester) async {
    await tester.pumpWidget(createWidgetUnderTest());
    await tester.pumpAndSettle();

    // Verifikasi Header
    expect(find.text('Ajukan Pengeluaran'), findsOneWidget);

    // Verifikasi Tombol Nota
    expect(find.text('Pindai Nota'), findsOneWidget);
    expect(find.text('Galeri'), findsOneWidget);

    // Verifikasi Input Fields
    expect(find.text('Judul'), findsOneWidget);
    expect(find.text('Rp'), findsOneWidget);
    expect(find.text('Kategori'), findsOneWidget);
    expect(find.text('Proyek'), findsOneWidget);
    expect(find.text('Fase'), findsOneWidget);
    expect(find.text('Task (opsional)'), findsOneWidget);

    // Verifikasi Tombol Bawah
    expect(find.text('Simpan Draft'), findsOneWidget);
    expect(find.text('Ajukan'), findsOneWidget);
  });

  testWidgets('Validasi form: Menolak submit jika nota belum dilampirkan',
      (WidgetTester tester) async {
    await tester.pumpWidget(createWidgetUnderTest());
    await tester.pumpAndSettle();

    // Tekan tombol Ajukan tanpa melampirkan nota
    final ajukanButton = find.text('Ajukan');
    await tester.tap(ajukanButton);
    await tester.pumpAndSettle();

    // Verifikasi pesan validasi nota muncul
    expect(find.text('Nota bukti pengeluaran wajib dilampirkan.'), findsOneWidget);
  });

  testWidgets('Input format ribuan pada field nominal berjalan dengan benar',
      (WidgetTester tester) async {
    await tester.pumpWidget(createWidgetUnderTest());
    await tester.pumpAndSettle();

    // Cari field nominal
    final amountField = find.byType(TextFormField).at(1);
    await tester.enterText(amountField, '6200000');
    await tester.pumpAndSettle();

    // Verifikasi pemisah ribuan otomatis terbentuk
    expect(find.text('6.200.000'), findsOneWidget);
  });
}

