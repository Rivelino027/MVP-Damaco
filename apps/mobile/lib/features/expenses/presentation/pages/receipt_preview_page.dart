import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';

class ReceiptPreviewPage extends StatefulWidget {
  final String imagePath;

  const ReceiptPreviewPage({
    super.key,
    required this.imagePath,
  });

  @override
  State<ReceiptPreviewPage> createState() => _ReceiptPreviewPageState();
}

class _ReceiptPreviewPageState extends State<ReceiptPreviewPage> {
  bool _isCompressing = false;

  Future<void> _confirmAndUsePhoto() async {
    setState(() {
      _isCompressing = true;
    });

    try {
      String finalPath = widget.imagePath;

      // Kompresi foto sebelum diunggah (hanya jika di platform mobile non-web)
      if (!kIsWeb && (Platform.isAndroid || Platform.isIOS)) {
        final targetPath = '${widget.imagePath}_compressed.jpg';
        final compressedFile = await FlutterImageCompress.compressAndGetFile(
          widget.imagePath,
          targetPath,
          quality: 80,
          minWidth: 1280,
          minHeight: 1280,
        );
        if (compressedFile != null) {
          finalPath = compressedFile.path;
        }
      }

      if (mounted) {
        Navigator.pop(context, finalPath);
      }
    } catch (_) {
      // Fallback ke path asli jika kompresi gagal
      if (mounted) {
        Navigator.pop(context, widget.imagePath);
      }
    } finally {
      if (mounted) {
        setState(() {
          _isCompressing = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF150324), // Signature Dark Purple
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.lg,
            vertical: AppSpacing.md,
          ),
          child: Column(
            children: [
              // 1. Header (Tombol X & Judul)
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Material(
                    color: Colors.white.withAlpha(40),
                    shape: const CircleBorder(),
                    child: InkWell(
                      onTap: () => Navigator.pop(context),
                      customBorder: const CircleBorder(),
                      child: const Padding(
                        padding: EdgeInsets.all(12),
                        child: Icon(
                          Icons.close_rounded,
                          color: Colors.white,
                          size: 20,
                        ),
                      ),
                    ),
                  ),
                  Text(
                    'Pratinjau',
                    style: AppTextStyles.subtitle1.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(width: 44), // Placeholder pengimbang
                ],
              ),
              const SizedBox(height: AppSpacing.lg),

              // 2. Pratinjau Foto Nota
              Expanded(
                child: Container(
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E0B36),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.white.withAlpha(30)),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(20),
                    child: kIsWeb
                        ? Image.network(
                            widget.imagePath,
                            fit: BoxFit.contain,
                            errorBuilder: (_, __, ___) => _buildFallbackPreview(),
                          )
                        : Image.file(
                            File(widget.imagePath),
                            fit: BoxFit.contain,
                            errorBuilder: (_, __, ___) => _buildFallbackPreview(),
                          ),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.xl),

              // 3. Tombol Ulangi & Pakai Foto
              Row(
                children: [
                  // Tombol Ulangi
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF423750),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: const Text(
                        'Ulangi',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),

                  // Tombol Pakai Foto
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _isCompressing ? null : _confirmAndUsePhoto,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: _isCompressing
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Text(
                              'Pakai Foto',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFallbackPreview() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.receipt_long_rounded,
            size: 80,
            color: Color(0xFFF29D38),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            'Nota Terlampir',
            style: AppTextStyles.subtitle1.copyWith(color: Colors.white),
          ),
        ],
      ),
    );
  }
}

