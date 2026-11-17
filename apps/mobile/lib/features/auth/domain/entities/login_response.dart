import 'user_entity.dart';

class LoginResponse {
  final String accessToken;
  final String refreshToken;
  final bool mustChangePassword;
  final UserEntity user;

  const LoginResponse({
    required this.accessToken,
    required this.refreshToken,
    required this.mustChangePassword,
    required this.user,
  });

  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    final userJson = json['user'] as Map<String, dynamic>;
    final mustChange = json['mustChangePassword'] == true ||
        json['mustChangePassword'] == 1 ||
        userJson['mustChangePassword'] == true ||
        userJson['mustChangePassword'] == 1;

    return LoginResponse(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      mustChangePassword: mustChange,
      user: UserEntity.fromJson(userJson),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'accessToken': accessToken,
      'refreshToken': refreshToken,
      'mustChangePassword': mustChangePassword,
      'user': user.toJson(),
    };
  }
}

