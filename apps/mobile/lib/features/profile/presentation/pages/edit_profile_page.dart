import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../auth/domain/entities/user_entity.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

class EditProfilePage extends ConsumerStatefulWidget {
  const EditProfilePage({super.key});

  @override
  ConsumerState<EditProfilePage> createState() => _EditProfilePageState();
}

class _EditProfilePageState extends ConsumerState<EditProfilePage> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _emailController;
  TextEditingController? _phoneController;

  File? _avatarFile;
  bool _isLoading = false;
  String? _errorMessage;

  late UserEntity _initialUser;

  @override
  void initState() {
    super.initState();
    final user = ref.read(currentUserProvider);
    _initialUser = user ??
        const UserEntity(
          id: 'usr-001',
          name: 'Rina Kusuma',
          email: 'rina.kusuma@budgetflow.id',
          role: 'pengguna',
          departmentName: 'Departemen IT',
          costCenterCode: 'CC-IT-02',
          costCenterName: 'Infrastruktur & Jaringan',
          phoneNumber: '0812-3456-7801',
        );

    _nameController = TextEditingController(text: _initialUser.name);
    _emailController = TextEditingController(text: _initialUser.email);

    // Catatan ketidakcocokan #3:
    // Tampilkan field nomor telepon hanya jika server backend mengembalikannya dalam payload.
    if (_initialUser.phoneNumber != null && _initialUser.phoneNumber!.isNotEmpty) {
      _phoneController = TextEditingController(text: _initialUser.phoneNumber);
    }

    _nameController.addListener(_onFieldChanged);
    _emailController.addListener(_onFieldChanged);
    _phoneController?.addListener(_onFieldChanged);
  }

  void _onFieldChanged() {
    setState(() {});
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController?.dispose();
    super.dispose();
  }

  bool get _isModified {
    final nameChanged = _nameController.text.trim() != _initialUser.name;
    final emailChanged = _emailController.text.trim().toLowerCase() !=
        _initialUser.email.toLowerCase();
    final phoneChanged = _phoneController != null &&
        _phoneController!.text.trim() != (_initialUser.phoneNumber ?? '');
    final avatarChanged = _avatarFile != null;

    return nameChanged || emailChanged || phoneChanged || avatarChanged;
  }

  bool get _isValid {
    final name = _nameController.text.trim();
    final email = _emailController.text.trim();
    return name.isNotEmpty && email.contains('@') && email.contains('.');
  }

  Future<void> _pickAvatar(ImageSource source) async {
    Navigator.of(context).pop(); // Tutup bottom sheet
    try {
      final picker = ImagePicker();
      final picked = await picker.pickImage(
        source: source,
        maxWidth: 800,
        maxHeight: 800,
        imageQuality: 85,
      );
      if (picked != null) {
        setState(() {
          _avatarFile = File(picked.path);
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal mengambil gambar: $e')),
        );
      }
    }
  }

  void _showAvatarPickerSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: AppSpacing.md),
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Text(
                'Ubah Foto Profil',
                style: AppTextStyles.subtitle1.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: AppSpacing.md),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: const BoxDecoration(
                    color: Color(0xFFEFE8F6),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.camera_alt_outlined, color: Color(0xFF431675)),
                ),
                title: const Text('Ambil dari Kamera'),
                onTap: () => _pickAvatar(ImageSource.camera),
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: const BoxDecoration(
                    color: Color(0xFFEFE8F6),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.photo_library_outlined, color: Color(0xFF431675)),
                ),
                title: const Text('Pilih dari Galeri'),
                onTap: () => _pickAvatar(ImageSource.gallery),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _handleSave() async {
    if (!_isModified || !_isValid) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final success = await ref.read(authProvider.notifier).updateProfile(
          name: _nameController.text.trim(),
          email: _emailController.text.trim(),
          phoneNumber: _phoneController?.text.trim(),
          avatarUrl: _avatarFile?.path,
        );

    if (mounted) {
      setState(() {
        _isLoading = false;
      });

      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profil berhasil diperbarui'),
            backgroundColor: AppColors.success,
            duration: Duration(seconds: 2),
          ),
        );
        Navigator.of(context).pop();
      } else {
        setState(() {
          _errorMessage = ref.read(authProvider).errorMessage ??
              'Gagal menyimpan perubahan profil. Coba lagi.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final departmentLabel = _initialUser.departmentName ?? 'Departemen IT';
    final costCenterFull =
        '${_initialUser.costCenterCode ?? 'CC-IT-02'} • ${_initialUser.costCenterName ?? 'Infrastruktur & Jaringan'}';

    final canSubmit = _isModified && _isValid && !_isLoading;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.chevron_left_rounded, size: 28),
          color: AppColors.textPrimary,
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Edit Profil',
          style: AppTextStyles.h3.copyWith(fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl, vertical: AppSpacing.lg),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // 1. Avatar dengan Tombol Kamera di kanan bawah
                Center(
                  child: Stack(
                    children: [
                      Container(
                        width: 90,
                        height: 90,
                        decoration: BoxDecoration(
                          color: const Color(0xFF2B0B4D),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 3),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withAlpha(25),
                              blurRadius: 8,
                              offset: const Offset(0, 3),
                            ),
                          ],
                          image: _avatarFile != null
                              ? DecorationImage(
                                  image: FileImage(_avatarFile!),
                                  fit: BoxFit.cover,
                                )
                              : null,
                        ),
                        child: _avatarFile == null
                            ? Center(
                                child: Text(
                                  _initialUser.initials,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 30,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              )
                            : null,
                      ),
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: GestureDetector(
                          onTap: _showAvatarPickerSheet,
                          child: Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: const Color(0xFF6B5E60),
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 2),
                            ),
                            child: const Icon(
                              Icons.camera_alt_outlined,
                              size: 16,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: AppSpacing.xl),

                if (_errorMessage != null) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFCE4E7),
                      borderRadius: AppSpacing.roundedCard,
                      border: Border.all(color: const Color(0xFFF5B6BC)),
                    ),
                    child: Text(
                      _errorMessage!,
                      style: const TextStyle(
                        color: Color(0xFFB0000F),
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                ],

                // 2. Field Nama
                _buildFormField(
                  label: 'Nama',
                  controller: _nameController,
                  hint: 'Masukkan nama lengkap',
                ),
                const SizedBox(height: AppSpacing.lg),

                // 3. Field Email
                _buildFormField(
                  label: 'Email',
                  controller: _emailController,
                  hint: 'Masukkan alamat email',
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: AppSpacing.lg),

                // 4. Field Nomor Telepon (Hanya jika didukung / ada)
                if (_phoneController != null) ...[
                  _buildFormField(
                    label: 'Nomor Telepon',
                    controller: _phoneController!,
                    hint: 'Masukkan nomor telepon',
                    keyboardType: TextInputType.phone,
                  ),
                  const SizedBox(height: AppSpacing.lg),
                ],

                // 5. Field Departemen (Terkunci dengan Gembok)
                _buildLockedField(
                  label: 'Departemen',
                  value: departmentLabel,
                ),
                const SizedBox(height: AppSpacing.lg),

                // 6. Field Cost Center (Terkunci dengan Gembok)
                _buildLockedField(
                  label: 'Cost Center',
                  value: costCenterFull,
                ),
                const SizedBox(height: AppSpacing.xxl),

                // 7. Tombol Simpan
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: canSubmit
                          ? const Color(0xFF2B0B4D)
                          : const Color(0xFFB0A6A8),
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: AppSpacing.roundedCard,
                      ),
                    ),
                    onPressed: canSubmit ? _handleSave : null,
                    child: _isLoading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2,
                            ),
                          )
                        : Text(
                            'Simpan',
                            style: TextStyle(
                              color: canSubmit ? Colors.white : Colors.white70,
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                            ),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFormField({
    required String label,
    required TextEditingController controller,
    required String hint,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppTextStyles.captionBold.copyWith(
            color: AppColors.textPrimary,
            fontSize: 13,
          ),
        ),
        const SizedBox(height: 6),
        Container(
          decoration: BoxDecoration(
            color: const Color(0xFFFBF8FD),
            borderRadius: AppSpacing.roundedCard,
            border: Border.all(color: AppColors.border),
          ),
          child: TextField(
            controller: controller,
            keyboardType: keyboardType,
            style: AppTextStyles.body1.copyWith(
              color: AppColors.textPrimary,
              fontSize: 14,
            ),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: const TextStyle(color: AppColors.textPlaceholder, fontSize: 13),
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              border: InputBorder.none,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildLockedField({
    required String label,
    required String value,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppTextStyles.captionBold.copyWith(
            color: AppColors.textPrimary,
            fontSize: 13,
          ),
        ),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: const Color(0xFFF9F7FA),
            borderRadius: AppSpacing.roundedCard,
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  value,
                  style: AppTextStyles.body2.copyWith(
                    color: AppColors.textSecondary,
                    fontSize: 13,
                  ),
                ),
              ),
              const Icon(
                Icons.lock_outline_rounded,
                size: 18,
                color: AppColors.textMuted,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

