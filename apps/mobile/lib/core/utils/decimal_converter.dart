import 'package:json_annotation/json_annotation.dart';

class DecimalConverter implements JsonConverter<double, dynamic> {
  const DecimalConverter();

  static String toDecimalString(dynamic json) {
    if (json == null) return '0.00';
    if (json is num) return json.toDouble().toStringAsFixed(2);
    if (json is String) {
      final sanitized = json.replaceAll(',', '.').trim();
      final val = double.tryParse(sanitized);
      return val != null ? val.toStringAsFixed(2) : '0.00';
    }
    return '0.00';
  }

  static double? toDouble(dynamic json) {
    return const NullableDecimalConverter().fromJson(json);
  }

  @override
  double fromJson(dynamic json) {
    if (json == null) return 0.0;
    if (json is num) return json.toDouble();
    if (json is String) {
      final sanitized = json.replaceAll(',', '.').trim();
      return double.tryParse(sanitized) ?? 0.0;
    }
    return 0.0;
  }

  @override
  dynamic toJson(double object) => object.toStringAsFixed(2);
}

class NullableDecimalConverter implements JsonConverter<double?, dynamic> {
  const NullableDecimalConverter();

  @override
  double? fromJson(dynamic json) {
    if (json == null) return null;
    if (json is num) return json.toDouble();
    if (json is String) {
      if (json.trim().isEmpty) return null;
      final sanitized = json.replaceAll(',', '.').trim();
      return double.tryParse(sanitized);
    }
    return null;
  }

  @override
  dynamic toJson(double? object) => object?.toStringAsFixed(2);
}

