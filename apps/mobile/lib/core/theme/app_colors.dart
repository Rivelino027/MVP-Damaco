import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // Signature Primary & Dark Shades (dari screenshot)
  static const Color primary = Color(0xFF2B0B4D); // Ungu sangat tua untuk tombol & ikon aktif
  static const Color primaryLight = Color(0xFF431675);
  static const Color primaryDark = Color(0xFF19062E);
  static const Color primarySoft = Color(0xFFEDE4F8); // Ungu muda lembut

  // Signature Dark Gradient & Glow
  static const Color gradientStart = Color(0xFF150324);
  static const Color gradientEnd = Color(0xFF2B0B4D);
  static const Color glowPink = Color(0xFFFF3366);
  static const Color glowRed = Color(0xFFE8141C);
  static const Color glowRedDark = Color(0xFFB0000F);

  // Surfaces & Backgrounds
  static const Color background = Color(0xFFF8F7FB); // Latar layar terang abu-ungu lembut
  static const Color surface = Colors.white;
  static const Color card = Colors.white;
  static const Color cardDark = Color(0xFF1E132D);
  static const Color cardBackground = card;

  // Borders & Dividers
  static const Color border = Color(0xFFEBE3E4);
  static const Color borderLight = Color(0xFFF0EBF0);
  static const Color divider = Color(0xFFEAE6ED);
  static const Color cardBorder = border;

  // Text Colors
  static const Color textPrimary = Color(0xFF1A0B0D);
  static const Color textSecondary = Color(0xFF6B5E60);
  static const Color textMuted = Color(0xFF9A8D8F);
  static const Color textPlaceholder = Color(0xFFB0A6A8);
  static const Color textOnDark = Colors.white;

  // Status & Semantic Colors
  // Merah / Bahaya (Wajib tint, jangan solid merah terang untuk status bahaya)
  static const Color danger = Color(0xFFB0000F);
  static const Color dangerTint = Color(0xFFFCE4E7);
  static const Color dangerBorder = Color(0xFFF5B6BC);

  // Sukses / Aman
  static const Color success = Color(0xFF2E7D32);
  static const Color successTint = Color(0xFFE8F5E9);
  static const Color successBorder = Color(0xFFA5D6A7);

  // Peringatan / Waspada
  static const Color warning = Color(0xFFF29D38);
  static const Color warningTint = Color(0xFFFDF0DC);
  static const Color warningText = Color(0xFF9A5A0A);
  static const Color warningBorder = Color(0xFFFFE0B2);

  // Info / Biru
  static const Color info = Color(0xFF0A47B8);
  static const Color infoTint = Color(0xFFE8F1FD);
  static const Color infoNavy = Color(0xFF0A2E7F);

  // Task Status Chips
  static const Color taskNotStartedBg = Color(0xFFF0EDF2);
  static const Color taskNotStartedFg = Color(0xFF6B5E60);

  static const Color taskInProgressBg = Color(0xFFEDE4F8);
  static const Color taskInProgressFg = Color(0xFF5E2796);

  static const Color taskReviewBg = Color(0xFFFDF0DC);
  static const Color taskReviewFg = Color(0xFF9A5A0A);

  static const Color taskCompletedBg = Color(0xFFE8F5E9);
  static const Color taskCompletedFg = Color(0xFF2E7D32);

  // Priority Chips
  static const Color priorityHighBg = Color(0xFFFCE4E7);
  static const Color priorityHighFg = Color(0xFFB0000F);

  static const Color priorityMediumBg = Color(0xFFFDF0DC);
  static const Color priorityMediumFg = Color(0xFF9A5A0A);

  static const Color priorityLowBg = Color(0xFFF0EDF2);
  static const Color priorityLowFg = Color(0xFF6B5E60);

  // Expense Categories (Default Fallback)
  static const Color categoryLabor = Color(0xFFE8141C); // Tenaga Kerja
  static const Color categoryMaterial = Color(0xFFF29D38); // Material
  static const Color categoryVendor = Color(0xFF0A47B8); // Vendor
  static const Color categoryOther = Color(0xFF6B5E60); // Lain-lain

  // Bottom Nav
  static const Color navPillBackground = Colors.white;
  static const Color navActiveBox = Color(0xFF2B0B4D);
  static const Color navInactive = Color(0xFF7A7082);

  // Shimmer
  static const Color shimmerBase = Color(0xFFEBE6ED);
  static const Color shimmerHighlight = Color(0xFFF7F5F9);
}

