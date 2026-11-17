import 'package:damacoflow/core/utils/form_validators.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('FormValidators - Email Validation', () {
    test('Empty email returns error', () {
      expect(FormValidators.validateEmail(null), 'Email wajib diisi');
      expect(FormValidators.validateEmail(''), 'Email wajib diisi');
      expect(FormValidators.validateEmail('   '), 'Email wajib diisi');
    });

    test('Invalid email returns format error', () {
      expect(FormValidators.validateEmail('invalid'), 'Format email tidak valid');
      expect(FormValidators.validateEmail('invalid@'), 'Format email tidak valid');
      expect(FormValidators.validateEmail('invalid@domain'), 'Format email tidak valid');
    });

    test('Valid email returns null', () {
      expect(FormValidators.validateEmail('lilit@damacoflow.id'), isNull);
      expect(FormValidators.validateEmail('ransink@damacoflow.id'), isNull);
      expect(FormValidators.validateEmail('user.name@company.co.id'), isNull);
    });
  });

  group('FormValidators - Login Password Validation', () {
    test('Empty password returns error', () {
      expect(FormValidators.validateLoginPassword(null), 'Kata sandi wajib diisi');
      expect(FormValidators.validateLoginPassword(''), 'Kata sandi wajib diisi');
    });

    test('Non-empty password returns null', () {
      expect(FormValidators.validateLoginPassword('anyPassword'), isNull);
    });
  });

  group('FormValidators - New Password Checklist Rules', () {
    test('hasMinLength checks 8 characters', () {
      expect(FormValidators.hasMinLength('1234567'), isFalse);
      expect(FormValidators.hasMinLength('12345678'), isTrue);
      expect(FormValidators.hasMinLength('123456789'), isTrue);
    });

    test('hasUpperAndLower checks uppercase and lowercase letters', () {
      expect(FormValidators.hasUpperAndLower('alllowercase'), isFalse);
      expect(FormValidators.hasUpperAndLower('ALLUPPERCASE'), isFalse);
      expect(FormValidators.hasUpperAndLower('UpperAndLower'), isTrue);
    });

    test('hasNumber checks presence of digits', () {
      expect(FormValidators.hasNumber('NoNumberHere'), isFalse);
      expect(FormValidators.hasNumber('Number123'), isTrue);
    });

    test('validateNewPassword returns accurate errors or null', () {
      expect(FormValidators.validateNewPassword(null), 'Kata sandi baru wajib diisi');
      expect(FormValidators.validateNewPassword(''), 'Kata sandi baru wajib diisi');
      expect(FormValidators.validateNewPassword('Abc1'), 'Kata sandi minimal 8 karakter');
      expect(FormValidators.validateNewPassword('alllowercase123'), 'Harus mengandung huruf besar dan kecil');
      expect(FormValidators.validateNewPassword('ALLUPPERCASE123'), 'Harus mengandung huruf besar dan kecil');
      expect(FormValidators.validateNewPassword('NoNumbersHere'), 'Harus mengandung setidaknya satu angka');
      expect(FormValidators.validateNewPassword('ValidPassword123'), isNull);
    });
  });
}

