import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_colors.dart';

class NotificationEntity {
  final String id;
  final String userId;
  final String type; // 'task', 'timesheet', 'expense', 'system'
  final String title;
  final String body;
  final String? refType; // 'task', 'timesheet', 'expense'
  final String? refId;
  final DateTime? readAt;
  final DateTime createdAt;

  const NotificationEntity({
    required this.id,
    required this.userId,
    required this.type,
    required this.title,
    required this.body,
    this.refType,
    this.refId,
    this.readAt,
    required this.createdAt,
  });

  bool get isRead => readAt != null;
  bool get isUnread => readAt == null;

  NotificationEntity copyWith({
    String? id,
    String? userId,
    String? type,
    String? title,
    String? body,
    String? refType,
    String? refId,
    DateTime? readAt,
    DateTime? createdAt,
  }) {
    return NotificationEntity(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      type: type ?? this.type,
      title: title ?? this.title,
      body: body ?? this.body,
      refType: refType ?? this.refType,
      refId: refId ?? this.refId,
      readAt: readAt ?? this.readAt,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  factory NotificationEntity.fromJson(Map<String, dynamic> json) {
    return NotificationEntity(
      id: json['id'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      type: json['type'] as String? ?? 'system',
      title: json['title'] as String? ?? '',
      body: json['body'] as String? ?? '',
      refType: json['refType'] as String?,
      refId: json['refId'] as String?,
      readAt: json['readAt'] != null
          ? DateTime.tryParse(json['readAt'].toString())
          : null,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'type': type,
      'title': title,
      'body': body,
      'refType': refType,
      'refId': refId,
      'readAt': readAt?.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
    };
  }

  /// Label waktu relatif atau tanggal ramah pengguna
  String get displayTime {
    final now = DateTime.now();
    final difference = now.difference(createdAt);

    if (difference.inSeconds < 60) {
      return 'Baru saja';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes} menit lalu';
    } else if (difference.inHours < 24) {
      return '${difference.inHours} jam lalu';
    } else if (difference.inDays == 1) {
      return 'Kemarin';
    } else if (difference.inDays < 7) {
      return '${difference.inDays} hari lalu';
    } else {
      return DateFormat('dd MMM yyyy', 'id_ID').format(createdAt);
    }
  }

  /// Ikon sesuai jenis notifikasi / referensi
  IconData get iconData {
    final ref = (refType ?? type).toLowerCase();
    switch (ref) {
      case 'task':
        return Icons.task_alt_rounded;
      case 'timesheet':
        return Icons.access_time_filled_rounded;
      case 'expense':
        return Icons.receipt_long_rounded;
      default:
        return Icons.notifications_active_rounded;
    }
  }

  /// Warna aksen ikon sesuai jenis notifikasi
  Color get iconColor {
    final ref = (refType ?? type).toLowerCase();
    switch (ref) {
      case 'task':
        return AppColors.primary;
      case 'timesheet':
        return const Color(0xFFF29D38); // Oranye
      case 'expense':
        return const Color(0xFF0A47B8); // Biru kategori
      default:
        return AppColors.textSecondary;
    }
  }
}

