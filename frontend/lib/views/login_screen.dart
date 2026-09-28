import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../theme/app_colors.dart';
import 'widgets/damaco_logo.dart';
import 'main_shell.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController(text: 'owner@projectflow.id');
  final _passwordController = TextEditingController(text: 'password123');

  void _quickLogin(String email) {
    _emailController.text = email;
    _passwordController.text = 'password123';
    _submit();
  }

  void _submit() async {
    final auth = context.read<AuthProvider>();
    final success = await auth.login(_emailController.text, _passwordController.text);
    if (success && mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const MainShell()),
      );
    } else if (!success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(auth.error ?? 'Login gagal. Periksa kembali email dan password.'),
          backgroundColor: AppColors.danger,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 440),
            padding: const EdgeInsets.all(36),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
              boxShadow: const [
                BoxShadow(color: Color(0x0F0F172A), blurRadius: 20, offset: Offset(0, 8)),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Center(
                  child: DamacoLogo(showText: true, size: 40),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Project & Budget Management SaaS',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                ),
                const SizedBox(height: 32),
                TextField(
                  controller: _emailController,
                  decoration: const InputDecoration(
                    labelText: 'Work Email Address',
                    prefixIcon: Icon(Icons.email_outlined, size: 18),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _passwordController,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'Password',
                    prefixIcon: Icon(Icons.lock_outline, size: 18),
                  ),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: auth.isLoading ? null : _submit,
                  child: auth.isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : const Text('Sign In to DAMACO', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                ),
                const SizedBox(height: 28),
                const Divider(color: AppColors.border),
                const SizedBox(height: 16),
                const Text(
                  'Demo Quick Role Login (Klik untuk Login Instant):',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textSecondary),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _roleChip('👑 Owner', 'owner@projectflow.id', Colors.purple),
                    _roleChip('📋 PM', 'pm@projectflow.id', AppColors.primary),
                    _roleChip('💻 Member/Dev', 'member@projectflow.id', AppColors.info),
                    _roleChip('💵 Finance', 'finance@projectflow.id', AppColors.warning),
                    _roleChip('🏢 Client', 'client@banknusantara.co.id', Colors.teal),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _roleChip(String label, String email, Color color) {
    return ActionChip(
      avatar: Icon(Icons.person, size: 14, color: color),
      label: Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
      backgroundColor: color.withValues(alpha: 0.1),
      side: BorderSide(color: color.withValues(alpha: 0.3)),
      onPressed: () => _quickLogin(email),
    );
  }
}
