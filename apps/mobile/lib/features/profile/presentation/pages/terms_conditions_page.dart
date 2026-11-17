import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';

class TermsConditionsPage extends StatelessWidget {
  const TermsConditionsPage({super.key});

  @override
  Widget build(BuildContext context) {
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
          'Syarat & Ketentuan',
          style: AppTextStyles.h3.copyWith(fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl, vertical: AppSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Terakhir diperbarui 1 Agustus 2026',
                style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
              ),
              const SizedBox(height: AppSpacing.xl),

              _buildSection(
                number: '1.',
                title: 'Penggunaan',
                content:
                    'BudgetFlow digunakan khusus untuk keperluan internal perusahaan. Akun bersifat pribadi dan tidak boleh dibagikan.',
              ),
              const SizedBox(height: AppSpacing.xl),

              _buildSection(
                number: '2.',
                title: 'Data Proyek',
                content:
                    'Seluruh data proyek, jam kerja, dan pengeluaran yang dicatat merupakan aset perusahaan dan dapat diaudit.',
              ),
              const SizedBox(height: AppSpacing.xl),

              _buildSection(
                number: '3.',
                title: 'Pemisahan Tugas',
                content:
                    'Tidak ada pengguna yang dapat menyetujui pengajuannya sendiri. Pembayaran hanya dicatat setelah verifikasi Finance.',
              ),
              const SizedBox(height: AppSpacing.xl),

              _buildSection(
                number: '4.',
                title: 'Koneksi',
                content:
                    'Aplikasi memerlukan koneksi internet aktif dan tidak menyediakan mode offline.',
              ),
              const SizedBox(height: AppSpacing.xxl),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSection({
    required String number,
    required String title,
    required String content,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '$number $title',
          style: AppTextStyles.subtitle1.copyWith(
            fontWeight: FontWeight.w800,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          content,
          style: AppTextStyles.body2.copyWith(
            color: AppColors.textSecondary,
            height: 1.45,
          ),
        ),
      ],
    );
  }
}

