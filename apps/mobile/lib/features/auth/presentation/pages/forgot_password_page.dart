import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/form_validators.dart';
import '../../../../core/widgets/app_button.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../providers/auth_provider.dart';

// TODO: konfirmasi endpoint password_resets pada backend
class ForgotPasswordPage extends ConsumerStatefulWidget {
  const ForgotPasswordPage({super.key});

  @override
  ConsumerState<ForgotPasswordPage> createState() => _ForgotPasswordPageState();
}

class _ForgotPasswordPageState extends ConsumerState<ForgotPasswordPage> {
  final _emailController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  bool _isLoading = false;
  bool _isSuccess = false;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final success = await ref
        .read(authProvider.notifier)
        .requestPasswordReset(_emailController.text);

    if (mounted) {
      setState(() {
        _isLoading = false;
        if (success) {
          _isSuccess = true;
        } else {
          _errorMessage = ref.read(authProvider).errorMessage ??
              'Gagal mengirim instruksi pemulihan. Silakan coba lagi.';
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Lupa Kata Sandi'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.xxl),
          child: _isSuccess ? _buildSuccessView() : _buildFormView(),
        ),
      ),
    );
  }

  Widget _buildFormView() {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: AppColors.primarySoft,
              borderRadius: AppSpacing.roundedCard,
            ),
            child: const Icon(
              Icons.lock_reset_rounded,
              size: 32,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: AppSpacing.xl),
          Text(
            'Pemulihan Kata Sandi',
            style: AppTextStyles.h1.copyWith(fontSize: 24),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            'Masukkan email akun Anda. Kami akan mengirimkan tautan untuk membuat kata sandi baru.',
            style: AppTextStyles.body2.copyWith(color: AppColors.textSecondary),
          ),
          const SizedBox(height: AppSpacing.xxl),

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

          AppTextField(
            label: 'Email Terdaftar',
            hint: 'nama@damacoflow.id',
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            validator: FormValidators.validateEmail,
            prefixIcon: const Icon(
              Icons.mail_outline_rounded,
              size: 20,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: AppSpacing.xxl),

          AppButton(
            text: 'Kirim Instruksi Reset',
            isLoading: _isLoading,
            onPressed: _handleSubmit,
          ),
          const SizedBox(height: AppSpacing.md),

          AppButton(
            text: 'Kembali ke Masuk',
            variant: AppButtonVariant.secondary,
            onPressed: () => context.pop(),
          ),
        ],
      ),
    );
  }

  Widget _buildSuccessView() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        const SizedBox(height: AppSpacing.xxxl),
        Container(
          width: 80,
          height: 80,
          decoration: const BoxDecoration(
            color: AppColors.successTint,
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.mark_email_read_rounded,
            size: 42,
            color: AppColors.success,
          ),
        ),
        const SizedBox(height: AppSpacing.xl),
        Text(
          'Instruksi Telah Dikirim',
          textAlign: TextAlign.center,
          style: AppTextStyles.h2,
        ),
        const SizedBox(height: AppSpacing.sm),
        Text(
          'Jika email ${_emailController.text} terdaftar di sistem, tautan pemulihan kata sandi telah dikirimkan ke kotak masuk Anda.',
          textAlign: TextAlign.center,
          style: AppTextStyles.body2,
        ),
        const SizedBox(height: AppSpacing.xxxl),
        AppButton(
          text: 'Kembali ke Layar Masuk',
          onPressed: () {
            context.go(AppRoutes.login);
          },
        ),
      ],
    );
  }
}

