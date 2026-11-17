import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:damacoflow/core/utils/form_validators.dart';
import 'package:damacoflow/features/auth/presentation/widgets/change_password_form.dart';

void main() {
  group('FormValidators - Password Logic Unit Tests', () {
    test('Memvalidasi batas minimal 8 karakter', () {
      expect(FormValidators.hasMinLength(''), isFalse);
      expect(FormValidators.hasMinLength('Pass1'), isFalse);
      expect(FormValidators.hasMinLength('Password123'), isTrue);
    });

    test('Memvalidasi keberadaan huruf besar dan huruf kecil', () {
      expect(FormValidators.hasUpperAndLower('lowercase123'), isFalse);
      expect(FormValidators.hasUpperAndLower('UPPERCASE123'), isFalse);
      expect(FormValidators.hasUpperAndLower('Password123'), isTrue);
    });

    test('Memvalidasi setidaknya mengandung 1 angka', () {
      expect(FormValidators.hasNumber('PasswordNoDigit'), isFalse);
      expect(FormValidators.hasNumber('Password123'), isTrue);
    });

    test('Validator lengkap mengembalikan pesan error sesuai aturan', () {
      expect(FormValidators.validateNewPassword(null), isNotNull);
      expect(FormValidators.validateNewPassword(''), isNotNull);
      expect(FormValidators.validateNewPassword('short'), contains('8 karakter'));
      expect(FormValidators.validateNewPassword('alllowercase1'), contains('huruf besar'));
      expect(FormValidators.validateNewPassword('ALLUPPERCASE1'), contains('huruf besar dan kecil'));
      expect(FormValidators.validateNewPassword('NoDigitsHere'), contains('angka'));
      expect(FormValidators.validateNewPassword('ValidPass123'), isNull);
    });
  });

  group('ChangePasswordForm - Widget Tests', () {
    Widget buildTestableWidget() {
      return const ProviderScope(
        child: MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: Padding(
                padding: EdgeInsets.all(16.0),
                child: ChangePasswordForm(),
              ),
            ),
          ),
        ),
      );
    }

    testWidgets('Merender field input, bar kekuatan, dan 3 aturan checklist kata sandi',
        (tester) async {
      await tester.pumpWidget(buildTestableWidget());

      expect(find.text('Kata Sandi Saat Ini'), findsOneWidget);
      expect(find.text('Kata Sandi Baru'), findsOneWidget);
      expect(find.text('Konfirmasi kata sandi'), findsOneWidget);
      expect(find.text('Minimal 8 karakter'), findsOneWidget);
      expect(find.text('Huruf besar dan Kecil'), findsOneWidget);
      expect(find.text('Angka'), findsOneWidget);
      expect(find.text('Simpan Kata Sandi'), findsOneWidget);
      expect(find.text('Demo: kata sandi saat ini adalah budgetflow'), findsOneWidget);
    });

    testWidgets('Indikator checklist berubah menjadi centang saat aturan terpenuhi',
        (tester) async {
      await tester.pumpWidget(buildTestableWidget());

      final formFields = find.byType(TextFormField);
      expect(formFields, findsNWidgets(3));

      // Ketik kata sandi parsial hanya huruf kecil
      await tester.enterText(formFields.at(1), 'abc');
      await tester.pump();

      // Belum ada yang centang
      expect(find.byIcon(Icons.check_rounded), findsNothing);

      // Ketik kata sandi valid yang memenuhi 8 char, upper, lower, dan digit
      await tester.enterText(formFields.at(1), 'Password123');
      await tester.pump();

      // Semua 3 aturan harus centang
      expect(find.byIcon(Icons.check_rounded), findsNWidgets(3));
    });

    testWidgets('Menampilkan pesan validasi jika konfirmasi kata sandi tidak cocok',
        (tester) async {
      await tester.pumpWidget(buildTestableWidget());

      final formFields = find.byType(TextFormField);
      expect(formFields, findsNWidgets(3));

      // Isi kata sandi saat ini
      await tester.enterText(formFields.at(0), 'budgetflow');
      // Isi kata sandi baru valid
      await tester.enterText(formFields.at(1), 'Password123');
      // Isi konfirmasi beda
      await tester.enterText(formFields.at(2), 'Beda12345');
      await tester.pump();

      // Tap Simpan
      await tester.tap(find.text('Simpan Kata Sandi'));
      await tester.pumpAndSettle();

      expect(find.text('Konfirmasi kata sandi tidak cocok'), findsOneWidget);
    });
  });
}

