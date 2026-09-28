import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';

/// Character Mascot 1: Project Manager with Task Clipboard
class ProjectManagerCharacter extends StatefulWidget {
  const ProjectManagerCharacter({super.key});

  @override
  State<ProjectManagerCharacter> createState() => _ProjectManagerCharacterState();
}

class _ProjectManagerCharacterState extends State<ProjectManagerCharacter> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _floatAnim;
  late Animation<double> _badgeAnim;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat(reverse: true);

    _floatAnim = Tween<double>(begin: -8, end: 8).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );

    _badgeAnim = Tween<double>(begin: 0.95, end: 1.05).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Stack(
          alignment: Alignment.center,
          children: [
            // Ambient Aura
            Container(
              width: 220,
              height: 220,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AppColors.primary.withValues(alpha: 0.35),
                    AppColors.primary.withValues(alpha: 0.0),
                  ],
                ),
              ),
            ),

            // Floating Mascot Body Container
            Transform.translate(
              offset: Offset(0, _floatAnim.value),
              child: Container(
                width: 200,
                height: 220,
                decoration: BoxDecoration(
                  color: AppColors.card,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.3), width: 3),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.25),
                      blurRadius: 30,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Center(
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      // Character Head & Torso Illustration
                      Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          // Head & Hair
                          Stack(
                            alignment: Alignment.center,
                            children: [
                              // Hair background
                              Container(
                                width: 80,
                                height: 80,
                                decoration: const BoxDecoration(
                                  color: Color(0xFF1E1B4B),
                                  shape: BoxShape.circle,
                                ),
                              ),
                              // Face
                              Container(
                                width: 68,
                                height: 68,
                                decoration: const BoxDecoration(
                                  color: Color(0xFFFFD1B3),
                                  shape: BoxShape.circle,
                                ),
                                child: Stack(
                                  children: [
                                    // Eyes
                                    Positioned(
                                      top: 26,
                                      left: 18,
                                      child: Container(width: 8, height: 8, decoration: const BoxDecoration(color: Color(0xFF0F172A), shape: BoxShape.circle)),
                                    ),
                                    Positioned(
                                      top: 26,
                                      right: 18,
                                      child: Container(width: 8, height: 8, decoration: const BoxDecoration(color: Color(0xFF0F172A), shape: BoxShape.circle)),
                                    ),
                                    // Cheeks
                                    Positioned(
                                      top: 32,
                                      left: 12,
                                      child: Container(width: 10, height: 6, decoration: BoxDecoration(color: Colors.pink.withValues(alpha: 0.4), borderRadius: BorderRadius.circular(3))),
                                    ),
                                    Positioned(
                                      top: 32,
                                      right: 12,
                                      child: Container(width: 10, height: 6, decoration: BoxDecoration(color: Colors.pink.withValues(alpha: 0.4), borderRadius: BorderRadius.circular(3))),
                                    ),
                                    // Smile
                                    Positioned(
                                      bottom: 16,
                                      left: 24,
                                      child: Container(
                                        width: 20,
                                        height: 10,
                                        decoration: const BoxDecoration(
                                          color: Color(0xFFDC2626),
                                          borderRadius: BorderRadius.only(
                                            bottomLeft: Radius.circular(10),
                                            bottomRight: Radius.circular(10),
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              // Tech Headset
                              Positioned(
                                top: 12,
                                child: Container(
                                  width: 76,
                                  height: 14,
                                  decoration: BoxDecoration(
                                    color: AppColors.primary,
                                    borderRadius: BorderRadius.circular(7),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          // Shirt Body & PM Jacket
                          Container(
                            width: 110,
                            height: 60,
                            decoration: const BoxDecoration(
                              color: AppColors.primary,
                              borderRadius: BorderRadius.only(
                                topLeft: Radius.circular(30),
                                topRight: Radius.circular(30),
                              ),
                            ),
                            child: Center(
                              child: Icon(Icons.assignment_turned_in, color: Colors.white.withValues(alpha: 0.9), size: 30),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // Top Left Floating Element: Sprint Badge
            Positioned(
              top: 10,
              left: 10,
              child: Transform.scale(
                scale: _badgeAnim.value,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.card,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                    boxShadow: const [BoxShadow(color: Color(0x1A000000), blurRadius: 10, offset: Offset(0, 4))],
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.bolt_rounded, color: Colors.amber, size: 18),
                      SizedBox(width: 4),
                      Text('Sprint 100% Done', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                    ],
                  ),
                ),
              ),
            ),

            // Bottom Right Floating Element: Task Check Card
            Positioned(
              bottom: 10,
              right: 10,
              child: Transform.scale(
                scale: _badgeAnim.value,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(color: AppColors.primary.withValues(alpha: 0.4), blurRadius: 12, offset: const Offset(0, 4)),
                    ],
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.check_circle_rounded, color: Colors.white, size: 16),
                      SizedBox(width: 6),
                      Text('18 Tasks Verified', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
                    ],
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

/// Character Mascot 2: Finance Specialist with Coin & Calculator
class FinanceSpecialistCharacter extends StatefulWidget {
  const FinanceSpecialistCharacter({super.key});

  @override
  State<FinanceSpecialistCharacter> createState() => _FinanceSpecialistCharacterState();
}

class _FinanceSpecialistCharacterState extends State<FinanceSpecialistCharacter> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _floatAnim;
  late Animation<double> _rotateCoinAnim;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat(reverse: true);

    _floatAnim = Tween<double>(begin: -8, end: 8).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );

    _rotateCoinAnim = Tween<double>(begin: -0.05, end: 0.05).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Stack(
          alignment: Alignment.center,
          children: [
            // Ambient Glow
            Container(
              width: 220,
              height: 220,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AppColors.info.withValues(alpha: 0.35),
                    AppColors.info.withValues(alpha: 0.0),
                  ],
                ),
              ),
            ),

            // Character Circle Container
            Transform.translate(
              offset: Offset(0, _floatAnim.value),
              child: Container(
                width: 200,
                height: 220,
                decoration: BoxDecoration(
                  color: AppColors.card,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.info.withValues(alpha: 0.3), width: 3),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.info.withValues(alpha: 0.25),
                      blurRadius: 30,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Head with Smart Glasses
                      Stack(
                        alignment: Alignment.center,
                        children: [
                          // Hair
                          Container(
                            width: 80,
                            height: 80,
                            decoration: const BoxDecoration(
                              color: Color(0xFF334155),
                              shape: BoxShape.circle,
                            ),
                          ),
                          // Face
                          Container(
                            width: 68,
                            height: 68,
                            decoration: const BoxDecoration(
                              color: Color(0xFFFFD1B3),
                              shape: BoxShape.circle,
                            ),
                            child: Stack(
                              children: [
                                // Glasses
                                Positioned(
                                  top: 22,
                                  left: 12,
                                  right: 12,
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Container(width: 18, height: 16, decoration: BoxDecoration(border: Border.all(color: Colors.black, width: 2.5), shape: BoxShape.circle)),
                                      Container(width: 8, height: 2, color: Colors.black),
                                      Container(width: 18, height: 16, decoration: BoxDecoration(border: Border.all(color: Colors.black, width: 2.5), shape: BoxShape.circle)),
                                    ],
                                  ),
                                ),
                                // Cheeks
                                Positioned(
                                  top: 34,
                                  left: 10,
                                  child: Container(width: 10, height: 6, decoration: BoxDecoration(color: Colors.orange.withValues(alpha: 0.4), borderRadius: BorderRadius.circular(3))),
                                ),
                                Positioned(
                                  top: 34,
                                  right: 10,
                                  child: Container(width: 10, height: 6, decoration: BoxDecoration(color: Colors.orange.withValues(alpha: 0.4), borderRadius: BorderRadius.circular(3))),
                                ),
                                // Big Happy Smile
                                Positioned(
                                  bottom: 14,
                                  left: 22,
                                  child: Container(
                                    width: 24,
                                    height: 12,
                                    decoration: const BoxDecoration(
                                      color: Color(0xFF0F172A),
                                      borderRadius: BorderRadius.only(
                                        bottomLeft: Radius.circular(12),
                                        bottomRight: Radius.circular(12),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),

                      // Finance Suit Body
                      Container(
                        width: 110,
                        height: 60,
                        decoration: const BoxDecoration(
                          color: AppColors.info,
                          borderRadius: BorderRadius.only(
                            topLeft: Radius.circular(30),
                            topRight: Radius.circular(30),
                          ),
                        ),
                        child: const Center(
                          child: Icon(Icons.account_balance_wallet_rounded, color: Colors.white, size: 30),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // Floating Coin Badge
            Positioned(
              top: 10,
              right: 15,
              child: Transform.rotate(
                angle: _rotateCoinAnim.value,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.amber,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: const [BoxShadow(color: Color(0x33F59E0B), blurRadius: 14, offset: Offset(0, 4))],
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('Rp', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Colors.white)),
                      SizedBox(width: 4),
                      Text('Budget Saved +15%', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
                    ],
                  ),
                ),
              ),
            ),

            // Floating Expense Control Tag
            Positioned(
              bottom: 10,
              left: 15,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: AppColors.card,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.info.withValues(alpha: 0.3)),
                  boxShadow: const [BoxShadow(color: Color(0x1A000000), blurRadius: 10, offset: Offset(0, 4))],
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.trending_down_rounded, color: AppColors.success, size: 18),
                    SizedBox(width: 4),
                    Text('Low Burn Rate', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

/// Character Mascot 3: Report & Invoice Analyst Specialist
class ReportAnalystCharacter extends StatefulWidget {
  const ReportAnalystCharacter({super.key});

  @override
  State<ReportAnalystCharacter> createState() => _ReportAnalystCharacterState();
}

class _ReportAnalystCharacterState extends State<ReportAnalystCharacter> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _floatAnim;
  late Animation<double> _scaleAnim;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat(reverse: true);

    _floatAnim = Tween<double>(begin: -8, end: 8).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );

    _scaleAnim = Tween<double>(begin: 0.95, end: 1.05).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Stack(
          alignment: Alignment.center,
          children: [
            // Ambient Aura
            Container(
              width: 220,
              height: 220,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AppColors.success.withValues(alpha: 0.35),
                    AppColors.success.withValues(alpha: 0.0),
                  ],
                ),
              ),
            ),

            // Mascot Circle Body
            Transform.translate(
              offset: Offset(0, _floatAnim.value),
              child: Container(
                width: 200,
                height: 220,
                decoration: BoxDecoration(
                  color: AppColors.card,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.success.withValues(alpha: 0.3), width: 3),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.success.withValues(alpha: 0.25),
                      blurRadius: 30,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Head with Cap
                      Stack(
                        alignment: Alignment.center,
                        children: [
                          // Hair & Cap
                          Container(
                            width: 80,
                            height: 80,
                            decoration: const BoxDecoration(
                              color: Color(0xFF065F46),
                              shape: BoxShape.circle,
                            ),
                          ),
                          // Face
                          Container(
                            width: 68,
                            height: 68,
                            decoration: const BoxDecoration(
                              color: Color(0xFFFED7AA),
                              shape: BoxShape.circle,
                            ),
                            child: Stack(
                              children: [
                                // Eyes with Winking/Happy Eyes
                                Positioned(
                                  top: 24,
                                  left: 18,
                                  child: Container(width: 8, height: 8, decoration: const BoxDecoration(color: Color(0xFF0F172A), shape: BoxShape.circle)),
                                ),
                                Positioned(
                                  top: 24,
                                  right: 18,
                                  child: const Icon(Icons.star, size: 12, color: Colors.amber),
                                ),
                                // Cheeks
                                Positioned(
                                  top: 32,
                                  left: 12,
                                  child: Container(width: 10, height: 6, decoration: BoxDecoration(color: Colors.red.withValues(alpha: 0.3), borderRadius: BorderRadius.circular(3))),
                                ),
                                Positioned(
                                  top: 32,
                                  right: 12,
                                  child: Container(width: 10, height: 6, decoration: BoxDecoration(color: Colors.red.withValues(alpha: 0.3), borderRadius: BorderRadius.circular(3))),
                                ),
                                // Open Joyful Mouth
                                Positioned(
                                  bottom: 14,
                                  left: 22,
                                  child: Container(
                                    width: 24,
                                    height: 12,
                                    decoration: const BoxDecoration(
                                      color: Color(0xFF16A34A),
                                      borderRadius: BorderRadius.only(
                                        bottomLeft: Radius.circular(12),
                                        bottomRight: Radius.circular(12),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),

                      // Analyst Shirt
                      Container(
                        width: 110,
                        height: 60,
                        decoration: const BoxDecoration(
                          color: AppColors.success,
                          borderRadius: BorderRadius.only(
                            topLeft: Radius.circular(30),
                            topRight: Radius.circular(30),
                          ),
                        ),
                        child: const Center(
                          child: Icon(Icons.analytics_rounded, color: Colors.white, size: 30),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // Top Floating Tag: PDF Certified
            Positioned(
              top: 10,
              left: 15,
              child: Transform.scale(
                scale: _scaleAnim.value,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.success,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(color: AppColors.success.withValues(alpha: 0.4), blurRadius: 12, offset: const Offset(0, 4)),
                    ],
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.picture_as_pdf_rounded, color: Colors.white, size: 16),
                      SizedBox(width: 6),
                      Text('Laporan PDF Ready', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
                    ],
                  ),
                ),
              ),
            ),

            // Bottom Floating Tag: Invoice Paid
            Positioned(
              bottom: 10,
              right: 15,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: AppColors.card,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.success.withValues(alpha: 0.3)),
                  boxShadow: const [BoxShadow(color: Color(0x1A000000), blurRadius: 10, offset: Offset(0, 4))],
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.verified_rounded, color: AppColors.success, size: 18),
                    SizedBox(width: 4),
                    Text('Invoice Paid ✓', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}
