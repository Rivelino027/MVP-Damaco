import 'package:flutter/material.dart';

class ExpenseCategoryEntity {
  final String id;
  final String name;
  final String code;
  final Color? color;
  final bool isActive;

  const ExpenseCategoryEntity({
    required this.id,
    required this.name,
    required this.code,
    this.color,
    this.isActive = true,
  });

  factory ExpenseCategoryEntity.fromJson(Map<String, dynamic> json) {
    Color? parsedColor;
    if (json['color'] != null) {
      final hex = json['color'].toString().replaceAll('#', '');
      final intVal = int.tryParse(hex, radix: 16);
      if (intVal != null) {
        parsedColor = Color(0xFF000000 | intVal);
      }
    }

    return ExpenseCategoryEntity(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      code: json['code']?.toString() ?? '',
      color: parsedColor ?? fallbackColorFor(json['name']?.toString() ?? ''),
      isActive: json['isActive'] == null ? true : (json['isActive'] == true || json['isActive'] == 1),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'code': code,
        'color': color != null
            ? '#${color!.toARGB32().toRadixString(16).padLeft(8, '0').substring(2).toUpperCase()}'
            : null,
        'isActive': isActive,
      };

  /// Fallback warna kategori sesuai aturan AGENT_RULES.md
  /// Tenaga Kerja #E8141C, Material #F29D38, Vendor #0A47B8, Lain-lain #6B5E60
  static Color fallbackColorFor(String categoryName) {
    final lower = categoryName.toLowerCase();
    if (lower.contains('tenaga') || lower.contains('kerja') || lower.contains('labor')) {
      return const Color(0xFFE8141C);
    }
    if (lower.contains('material') || lower.contains('perangkat') || lower.contains('alat')) {
      return const Color(0xFFF29D38);
    }
    if (lower.contains('vendor') || lower.contains('jasa') || lower.contains('sewa')) {
      return const Color(0xFF0A47B8);
    }
    return const Color(0xFF6B5E60);
  }
}

