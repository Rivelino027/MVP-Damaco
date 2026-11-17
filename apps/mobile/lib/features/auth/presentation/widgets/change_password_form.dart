import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/form_validators.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../providers/auth_provider.dart';

class ChangePasswordForm extends ConsumerStatefulWidget {
  final bool isForced;
  final VoidCallback? onSuccess;

  const ChangePasswordForm({
    super.key,
    this.isForced = false,
    this.onSuccess,
  });

  @override
  ConsumerState<ChangePasswordForm> createState() => _ChangePasswordFormState();
}

class _ChangePasswordFormState extends ConsumerState<ChangePasswordForm> {
  final _oldPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  bool _isLoading = false;
  String? _errorMessage;

  // Real-time tracking
  String _newPassword = '';

  @override
  void initState() {
    super.initState();
    _newPasswordController.addListener(() {
      setState(() {
        _newPassword = _newPasswordController.text;
      });
    });
  }

  @override
  void dispose() {
    _oldPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  bool get _hasMinLength => FormValidators.hasMinLength(_newPassword);
  bool get _hasUpperLower => FormValidators.hasUpperAndLower(_newPassword);
  bool get _hasNumber => FormValidators.hasNumber(_newPassword);
  bool get _allRequirementsMet => _hasMinLength && _hasUpperLower && _hasNumber;

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    if (!_allRequirementsMet) {
      setState(() {
        _errorMessage = 'Kata sandi baru belum memenuhi semua aturan keamanan.';
      });
      return;
    }

    if (_newPasswordController.text != _confirmPasswordController.text) {
      setState(() {
        _errorMessage = 'Konfirmasi kata sandi baru tidak cocok.';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final success = await ref.read(authProvider.notifier).changePassword(
          oldPassword: _oldPasswordController.text,
          newPassword: _newPasswordController.text,
        );

    if (mounted) {
      setState(() {
        _isLoading = false;
      });

      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Kata sandi berhasil diperbarui'),
            backgroundColor: AppColors.success,
          ),
        );
        widget.onSuccess?.call();
      } else {
        setState(() {
          _errorMessage = ref.read(authProvider).errorMessage ??
              'Gagal memperbarui kata sandi. Coba lagi.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (widget.isForced) ...[
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: AppColors.infoTint,
                borderRadius: AppSpacing.roundedMd,
                border: Border.all(color: AppColors.info.withAlpha(50)),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.security_rounded,
                    color: AppColors.info,
                    size: 20,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      'Akun Anda wajib mengganti kata sandi sementara sebelum melanjutkan ke aplikasi.',
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.infoNavy,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
          ],

          if (_errorMessage != null) ...[
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: AppColors.dangerTint,
                borderRadius: AppSpacing.roundedMd,
                border: Border.all(color: AppColors.dangerBorder),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.error_outline_rounded,
                    size: 18,
                    color: AppColors.danger,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      _errorMessage!,
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.danger,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
          ],

          // Kata Sandi Lama
          AppTextField(
            label: 'Kata Sandi Saat Ini',
            hint: 'Masukkan kata sandi lama',
            controller: _oldPasswordController,
            obscureText: true,
            validator: (v) =>
                v == null || v.isEmpty ? 'Kata sandi saat ini wajib diisi' : null,
          ),
          const SizedBox(height: AppSpacing.lg),

          // Kata Sandi Baru
          AppTextField(
            label: 'Kata Sandi Baru',
            hint: 'Masukkan kata sandi baru',
            controller: _newPasswordController,
            obscureText: true,
            validator: (v) =>
                v == null || v.isEmpty ? 'Kata sandi baru wajib diisi' : null,
          ),
          const SizedBox(height: AppSpacing.sm),

          // Bar Indikator Kekuatan Sandi (3 Segmen)
          _buildStrengthBar(),
          const SizedBox(height: AppSpacing.md),

          // Checklist Indikator Aturan Kata Sandi
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: const Color(0xFFFBF8FD),
              borderRadius: AppSpacing.roundedCard,
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildRuleItem('Minimal 8 karakter', _hasMinLength),
                const SizedBox(height: 8),
                _buildRuleItem('Huruf besar dan Kecil', _hasUpperLower),
                const SizedBox(height: 8),
                _buildRuleItem('Angka', _hasNumber),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),

          // Konfirmasi Kata Sandi Baru
          AppTextField(
            label: 'Konfirmasi kata sandi',
            hint: 'Ketik ulang kata sandi baru',
            controller: _confirmPasswordController,
            obscureText: true,
            validator: (v) {
              if (v == null || v.isEmpty) {
                return 'Konfirmasi kata sandi wajib diisi';
              }
              if (v != _newPasswordController.text) {
                return 'Konfirmasi kata sandi tidak cocok';
              }
              return null;
            },
          ),
          const SizedBox(height: 6),
          Text(
            'Demo: kata sandi saat ini adalah budgetflow',
            style: AppTextStyles.caption.copyWith(
              color: AppColors.textPlaceholder,
              fontSize: 11,
            ),
          ),
          const SizedBox(height: AppSpacing.xxl),

          // Tombol Simpan
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: _allRequirementsMet &&
                        _confirmPasswordController.text.isNotEmpty &&
                        _newPasswordController.text == _confirmPasswordController.text
                    ? const Color(0xFF2B0B4D)
                    : const Color(0xFFB0A6A8),
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: AppSpacing.roundedCard,
                ),
              ),
              onPressed: _isLoading ? null : _handleSubmit,
              child: _isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : const Text(
                      'Simpan Kata Sandi',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStrengthBar() {
    int metCount = (_hasMinLength ? 1 : 0) +
        (_hasUpperLower ? 1 : 0) +
        (_hasNumber ? 1 : 0);

    Color activeColor;
    if (metCount == 1) {
      activeColor = AppColors.danger;
    } else if (metCount == 2) {
      activeColor = AppColors.warning;
    } else if (metCount == 3) {
      activeColor = AppColors.success;
    } else {
      activeColor = Colors.grey.shade300;
    }

    return Row(
      children: List.generate(3, (index) {
        final isFilled = index < metCount;
        return Expanded(
          child: Container(
            height: 4,
            margin: EdgeInsets.only(
              right: index < 2 ? 6.0 : 0.0,
            ),
            decoration: BoxDecoration(
              color: isFilled ? activeColor : Colors.grey.shade300,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        );
      }),
    );
  }

  Widget _buildRuleItem(String text, bool isMet) {
    return Row(
      children: [
        Icon(
          isMet ? Icons.check_rounded : Icons.close_rounded,
          size: 16,
          color: isMet ? AppColors.success : AppColors.textPlaceholder,
        ),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: Text(
            text,
            style: AppTextStyles.caption.copyWith(
              color: isMet ? AppColors.success : AppColors.textSecondary,
              fontWeight: isMet ? FontWeight.w600 : FontWeight.w400,
              fontSize: 13,
            ),
          ),
        ),
      ],
    );
  }
}

