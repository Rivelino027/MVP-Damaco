import 'package:flutter/material.dart';

class AppSpacing {
  AppSpacing._();

  // Spacing Units
  static const double xs = 4.0;
  static const double sm = 8.0;
  static const double md = 12.0;
  static const double lg = 16.0;
  static const double xl = 20.0;
  static const double xxl = 24.0;
  static const double xxxl = 32.0;
  static const double huge = 48.0;

  // Screen Insets
  static const double screenPaddingHorizontal = 20.0;
  static const double screenPaddingVertical = 16.0;

  // Corner Radius
  static const double radiusXs = 4.0;
  static const double radiusSm = 8.0;
  static const double radiusMd = 12.0;
  static const double radiusCard = 16.0;
  static const double radiusCardLarge = 20.0;
  static const double radiusCardXLarge = 24.0;
  static const double radiusPill = 999.0;

  // BorderRadius objects for convenience
  static const BorderRadius roundedSm = BorderRadius.all(Radius.circular(radiusSm));
  static const BorderRadius roundedMd = BorderRadius.all(Radius.circular(radiusMd));
  static const BorderRadius roundedCard = BorderRadius.all(Radius.circular(radiusCard));
  static const BorderRadius roundedCardLarge = BorderRadius.all(Radius.circular(radiusCardLarge));
  static const BorderRadius roundedCardXLarge = BorderRadius.all(Radius.circular(radiusCardXLarge));
  static const BorderRadius roundedPill = BorderRadius.all(Radius.circular(radiusPill));

  // Soft Shadows
  static const List<BoxShadow> softShadow = [
    BoxShadow(
      color: Color(0x0C1A0507),
      blurRadius: 16,
      offset: Offset(0, 4),
    ),
  ];

  static const List<BoxShadow> cardShadow = [
    BoxShadow(
      color: Color(0x0D2B0B4D),
      blurRadius: 18,
      offset: Offset(0, 6),
      spreadRadius: -2,
    ),
  ];

  static const List<BoxShadow> floatingNavShadow = [
    BoxShadow(
      color: Color(0x181A0507),
      blurRadius: 24,
      offset: Offset(0, 8),
      spreadRadius: 0,
    ),
  ];

  static const List<BoxShadow> bottomNavShadow = floatingNavShadow;
}

