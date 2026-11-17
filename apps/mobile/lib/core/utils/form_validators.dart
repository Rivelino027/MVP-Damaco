class FormValidators {
  FormValidators._();

  static final RegExp _emailRegExp = RegExp(
    r'^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$',
  );

  /// Validasi email
  static String? validateEmail(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Email wajib diisi';
    }
    final trimmed = value.trim();
    if (!_emailRegExp.hasMatch(trimmed) || !trimmed.contains('.')) {
      return 'Format email tidak valid';
    }
    return null;
  }

  /// Validasi kata sandi saat login
  static String? validateLoginPassword(String? value) {
    if (value == null || value.isEmpty) {
      return 'Kata sandi wajib diisi';
    }
    return null;
  }

  /// Rule check untuk kata sandi baru (8 char, upper & lower, number)
  static bool hasMinLength(String password, [int min = 8]) => password.length >= min;
  static bool hasUpperAndLower(String password) =>
      password.contains(RegExp(r'[A-Z]')) && password.contains(RegExp(r'[a-z]'));
  static bool hasNumber(String password) => password.contains(RegExp(r'[0-9]'));

  /// Memvalidasi kata sandi baru secara keseluruhan
  static String? validateNewPassword(String? value) {
    if (value == null || value.isEmpty) {
      return 'Kata sandi baru wajib diisi';
    }
    if (!hasMinLength(value)) {
      return 'Kata sandi minimal 8 karakter';
    }
    if (!hasUpperAndLower(value)) {
      return 'Harus mengandung huruf besar dan kecil';
    }
    if (!hasNumber(value)) {
      return 'Harus mengandung setidaknya satu angka';
    }
    return null;
  }
}

