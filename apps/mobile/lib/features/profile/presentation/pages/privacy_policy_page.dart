import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';

class PrivacyPolicyPage extends StatelessWidget {
  const PrivacyPolicyPage({super.key});

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
          'Kebijakan Privasi',
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
                title: 'Data yang Dikumpulkan',
                content:
                    'Kami menyimpan profil kerja, catatan jam, nota pengeluaran, dan riwayat persetujuan Anda.',
              ),
              const SizedBox(height: AppSpacing.xl),

              _buildSection(
                number: '2.',
                title: 'Penggunaan Data',
                content:
                    'Data dipakai untuk perhitungan biaya proyek, persetujuan, dan pelaporan anggaran internal.',
              ),
              const SizedBox(height: AppSpacing.xl),

              _buildSection(
                number: '3.',
                title: 'Keamanan',
                content:
                    'Data dienkripsi saat transit dan penyimpanan. Akses dibatasi sesuai peran.',
              ),
              const SizedBox(height: AppSpacing.xl),

              _buildSection(
                number: '4.',
                title: 'Hak Anda',
                content:
                    'Anda dapat meminta koreksi data profil melalui Hubungi Dukungan.',
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

