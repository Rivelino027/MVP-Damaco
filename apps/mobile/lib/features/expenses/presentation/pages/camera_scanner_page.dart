import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import 'receipt_preview_page.dart';

class CameraScannerPage extends StatefulWidget {
  const CameraScannerPage({super.key});

  @override
  State<CameraScannerPage> createState() => _CameraScannerPageState();
}

class _CameraScannerPageState extends State<CameraScannerPage>
    with WidgetsBindingObserver {
  CameraController? _controller;
  List<CameraDescription> _cameras = [];
  bool _isCameraInitialized = false;
  bool _isFlashOn = false;
  bool _isPermissionDenied = false;
  bool _isPermanentlyDenied = false;
  bool _isTakingPicture = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _setupCamera();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _controller?.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final cameraController = _controller;
    if (cameraController == null || !cameraController.value.isInitialized) {
      return;
    }
    if (state == AppLifecycleState.inactive) {
      cameraController.dispose();
    } else if (state == AppLifecycleState.resumed) {
      _setupCamera();
    }
  }

  Future<void> _setupCamera() async {
    try {
      _cameras = await availableCameras();
      if (_cameras.isEmpty) {
        setState(() {
          _isPermissionDenied = true;
        });
        return;
      }

      final backCamera = _cameras.firstWhere(
        (cam) => cam.lensDirection == CameraLensDirection.back,
        orElse: () => _cameras.first,
      );

      final controller = CameraController(
        backCamera,
        ResolutionPreset.high,
        enableAudio: false,
      );

      _controller = controller;

      await controller.initialize();
      if (!mounted) return;

      setState(() {
        _isCameraInitialized = true;
        _isPermissionDenied = false;
        _isPermanentlyDenied = false;
      });
    } on CameraException catch (e) {
      if (!mounted) return;
      if (e.code == 'CameraAccessDenied') {
        setState(() {
          _isPermissionDenied = true;
          _isPermanentlyDenied = false;
        });
      } else if (e.code == 'CameraAccessDeniedWithoutPrompt' ||
          e.code == 'CameraAccessRestricted') {
        setState(() {
          _isPermissionDenied = true;
          _isPermanentlyDenied = true;
        });
      } else {
        setState(() {
          _isPermissionDenied = true;
        });
      }
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isPermissionDenied = true;
      });
    }
  }

  Future<void> _toggleFlash() async {
    if (_controller == null || !_controller!.value.isInitialized) return;
    try {
      final newMode = _isFlashOn ? FlashMode.off : FlashMode.torch;
      await _controller!.setFlashMode(newMode);
      setState(() {
        _isFlashOn = !_isFlashOn;
      });
    } catch (_) {}
  }

  Future<void> _takePicture() async {
    if (_controller == null ||
        !_controller!.value.isInitialized ||
        _isTakingPicture) {
      return;
    }

    try {
      setState(() {
        _isTakingPicture = true;
      });

      final image = await _controller!.takePicture();
      if (!mounted) return;

      _openPreview(image.path);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal mengambil foto: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isTakingPicture = false;
        });
      }
    }
  }

  Future<void> _pickFromGallery() async {
    try {
      final picker = ImagePicker();
      final picked = await picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 85,
      );

      if (picked != null && mounted) {
        _openPreview(picked.path);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal membuka galeri: $e')),
        );
      }
    }
  }

  void _openPreview(String filePath) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (ctx) => ReceiptPreviewPage(imagePath: filePath),
      ),
    ).then((result) {
      if (result != null && mounted) {
        // Mengembalikan path hasil foto terpilih ke form
        Navigator.pop(context, result);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF150324), // Signature Dark Purple
      body: SafeArea(
        child: Stack(
          children: [
            // 1. Camera Viewfinder atau Fallback View
            if (_isCameraInitialized && _controller != null)
              SizedBox.expand(
                child: FittedBox(
                  fit: BoxFit.cover,
                  child: SizedBox(
                    width: _controller!.value.previewSize?.height ?? 1,
                    height: _controller!.value.previewSize?.width ?? 1,
                    child: CameraPreview(_controller!),
                  ),
                ),
              )
            else if (_isPermissionDenied)
              _buildPermissionDeniedView()
            else
              const Center(
                child: CircularProgressIndicator(color: Colors.white),
              ),

            // 2. Overlay Scanning Frame (Kotak dengan Sudut Oranye & Garis Pemandu)
            if (_isCameraInitialized && !_isPermissionDenied)
              Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 290,
                      height: 380,
                      decoration: BoxDecoration(
                        color: Colors.transparent,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Stack(
                        children: [
                          // 4 Sudut Oranye (L-Bracket)
                          const Positioned(
                            top: 0,
                            left: 0,
                            child: _CornerBracket(isTop: true, isLeft: true),
                          ),
                          const Positioned(
                            top: 0,
                            right: 0,
                            child: _CornerBracket(isTop: true, isLeft: false),
                          ),
                          const Positioned(
                            bottom: 0,
                            left: 0,
                            child: _CornerBracket(isTop: false, isLeft: true),
                          ),
                          const Positioned(
                            bottom: 0,
                            right: 0,
                            child: _CornerBracket(isTop: false, isLeft: false),
                          ),

                          // Garis Pemandu Horizontal Oranye di Tengah
                          Center(
                            child: Container(
                              width: 250,
                              height: 1.5,
                              color: const Color(0xFFF29D38).withAlpha(180),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    // Teks Instruksi
                    Text(
                      'Posisikan nota di dalam bingkai',
                      style: AppTextStyles.caption.copyWith(
                        color: Colors.white.withAlpha(220),
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),

            // 3. Top Bar (Tombol X, Judul, Tombol Flash)
            Positioned(
              top: AppSpacing.md,
              left: AppSpacing.lg,
              right: AppSpacing.lg,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Tombol Tutup (X)
                  _CircularActionButton(
                    icon: Icons.close_rounded,
                    onTap: () => Navigator.pop(context),
                  ),

                  // Judul
                  Text(
                    'Pindai Nota',
                    style: AppTextStyles.subtitle1.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                    ),
                  ),

                  // Tombol Flash
                  _CircularActionButton(
                    icon: _isFlashOn
                        ? Icons.flash_on_rounded
                        : Icons.flash_off_rounded,
                    backgroundColor: _isFlashOn
                        ? const Color(0xFFF29D38) // Oranye aktif
                        : Colors.white.withAlpha(40),
                    iconColor: _isFlashOn ? Colors.black : Colors.white,
                    onTap: _toggleFlash,
                  ),
                ],
              ),
            ),

            // 4. Bottom Controls (Galeri & Shutter Button)
            Positioned(
              bottom: AppSpacing.xl,
              left: AppSpacing.xl,
              right: AppSpacing.xl,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  // Tombol Buka Galeri
                  _CircularActionButton(
                    icon: Icons.photo_library_outlined,
                    iconSize: 24,
                    padding: 16,
                    onTap: _pickFromGallery,
                  ),

                  // Tombol Shutter Putih Besar
                  GestureDetector(
                    onTap: _isTakingPicture ? null : _takePicture,
                    child: Container(
                      width: 76,
                      height: 76,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 4),
                      ),
                      child: Center(
                        child: Container(
                          width: 60,
                          height: 60,
                          decoration: const BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                          ),
                          child: _isTakingPicture
                              ? const Padding(
                                  padding: EdgeInsets.all(16.0),
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2.5,
                                    color: AppColors.primary,
                                  ),
                                )
                              : null,
                        ),
                      ),
                    ),
                  ),

                  // Spacer seimbang
                  const SizedBox(width: 52),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPermissionDeniedView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.no_photography_outlined,
              size: 64,
              color: Colors.white70,
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              'Akses Kamera Ditolak',
              style: AppTextStyles.h2.copyWith(color: Colors.white),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              _isPermanentlyDenied
                  ? 'Izin kamera ditolak secara permanen. Silakan aktifkan izin kamera melalui Pengaturan perangkat Anda.'
                  : 'Aplikasi membutuhkan izin akses kamera untuk memindai nota fisik secara langsung.',
              textAlign: TextAlign.center,
              style: AppTextStyles.body2.copyWith(color: Colors.white70),
            ),
            const SizedBox(height: AppSpacing.xl),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                OutlinedButton(
                  onPressed: _setupCamera,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: Colors.white54),
                  ),
                  child: const Text('Coba Lagi'),
                ),
                const SizedBox(width: AppSpacing.md),
                ElevatedButton.icon(
                  onPressed: _pickFromGallery,
                  icon: const Icon(Icons.photo_library_outlined, size: 16),
                  label: const Text('Pilih dari Galeri'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFF29D38),
                    foregroundColor: Colors.black,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CornerBracket extends StatelessWidget {
  final bool isTop;
  final bool isLeft;

  const _CornerBracket({required this.isTop, required this.isLeft});

  @override
  Widget build(BuildContext context) {
    const double size = 32.0;
    const double thickness = 3.5;
    const Color color = Color(0xFFF29D38); // Oranye pemindai

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        children: [
          // Garis horizontal
          Positioned(
            top: isTop ? 0 : null,
            bottom: isTop ? null : 0,
            left: isLeft ? 0 : null,
            right: isLeft ? null : 0,
            child: Container(
              width: size,
              height: thickness,
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          // Garis vertikal
          Positioned(
            top: isTop ? 0 : null,
            bottom: isTop ? null : 0,
            left: isLeft ? 0 : null,
            right: isLeft ? null : 0,
            child: Container(
              width: thickness,
              height: size,
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CircularActionButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final Color? backgroundColor;
  final Color iconColor;
  final double iconSize;
  final double padding;

  const _CircularActionButton({
    required this.icon,
    required this.onTap,
    this.backgroundColor,
    this.iconColor = Colors.white,
    this.iconSize = 20,
    this.padding = 12,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: backgroundColor ?? Colors.white.withAlpha(40),
      shape: const CircleBorder(),
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: Padding(
          padding: EdgeInsets.all(padding),
          child: Icon(icon, color: iconColor, size: iconSize),
        ),
      ),
    );
  }
}

