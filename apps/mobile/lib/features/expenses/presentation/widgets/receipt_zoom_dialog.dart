import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

class ReceiptZoomDialog extends StatelessWidget {
  final String imagePath;
  final bool isNetwork;

  const ReceiptZoomDialog({
    super.key,
    required this.imagePath,
    this.isNetwork = false,
  });

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.all(12),
      child: Stack(
        alignment: Alignment.topRight,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Container(
              color: Colors.black87,
              child: InteractiveViewer(
                panEnabled: true,
                minScale: 0.8,
                maxScale: 4.0,
                child: Center(
                  child: isNetwork || kIsWeb || imagePath.startsWith('http')
                      ? Image.network(
                          imagePath,
                          fit: BoxFit.contain,
                          errorBuilder: (_, __, ___) => const Center(
                            child: Icon(Icons.receipt_long_rounded,
                                size: 80, color: Colors.white70),
                          ),
                        )
                      : Image.file(
                          File(imagePath),
                          fit: BoxFit.contain,
                          errorBuilder: (_, __, ___) => const Center(
                            child: Icon(Icons.receipt_long_rounded,
                                size: 80, color: Colors.white70),
                          ),
                        ),
                ),
              ),
            ),
          ),
          // Tombol Tutup
          Positioned(
            top: 12,
            right: 12,
            child: Material(
              color: Colors.black54,
              shape: const CircleBorder(),
              child: IconButton(
                icon: const Icon(Icons.close_rounded, color: Colors.white),
                onPressed: () => Navigator.pop(context),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

