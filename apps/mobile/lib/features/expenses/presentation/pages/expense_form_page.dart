import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/network/app_exception.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/rupiah_input_formatter.dart';
import '../../domain/entities/expense_entity.dart';
import '../providers/expenses_provider.dart';
import 'camera_scanner_page.dart';
import 'expense_success_page.dart';

class ExpenseFormPage extends ConsumerStatefulWidget {
  final ExpenseEntity? expenseToEdit;

  const ExpenseFormPage({
    super.key,
    this.expenseToEdit,
  });

  @override
  ConsumerState<ExpenseFormPage> createState() => _ExpenseFormPageState();
}

class _ExpenseFormPageState extends ConsumerState<ExpenseFormPage> {
  final _formKey = GlobalKey<FormState>();

  String? _attachedReceiptPath;
  late final TextEditingController _titleController;
  late final TextEditingController _amountController;
  late final TextEditingController _noteController;

  String? _selectedCategoryId;
  String? _selectedProjectId;
  String? _selectedCostCenterId;
  String? _selectedPhaseId;
  String? _selectedTaskId;

  bool _isSubmitting = false;
  String? _errorMessage;

  // Mock list proyek & fase & task yang dapat dipilih
  final List<Map<String, dynamic>> _projects = [
    {
      'id': 'prj-001',
      'name': 'Renovasi Lab Jaringan',
      'costCenterId': 'cc-001',
      'phases': [
        {'id': 'ph-1', 'name': 'Fase 1: Pengadaan Perangkat'},
        {'id': 'ph-2', 'name': 'Fase 2: Instalasi & Terminasi'},
      ],
      'tasks': [
        {'id': 'task-1', 'title': 'Konfigurasi VLAN lantai 2'},
        {'id': 'task-2', 'title': 'Dokumentasi topologi jaringan'},
      ],
    },
    {
      'id': 'prj-002',
      'name': 'Migrasi Server',
      'costCenterId': 'cc-002',
      'phases': [
        {'id': 'ph-3', 'name': 'Fase 1: Setup Cloud'},
        {'id': 'ph-4', 'name': 'Fase 2: Sinkronisasi Database'},
      ],
      'tasks': [
        {'id': 'task-3', 'title': 'Setup monitoring server baru'},
        {'id': 'task-4', 'title': 'Backup server utama'},
      ],
    },
    {
      'id': 'prj-003',
      'name': 'Aplikasi Mobile Cabang',
      'costCenterId': 'cc-003',
      'phases': [
        {'id': 'ph-5', 'name': 'Fase 1: Desain & Prototyping'},
        {'id': 'ph-6', 'name': 'Fase 2: Pengembangan Frontend'},
      ],
      'tasks': [
        {'id': 'task-7', 'title': 'Uji koneksi antar cabang'},
      ],
    },
  ];

  final List<Map<String, String>> _categories = [
    {'id': 'cat-mat', 'name': 'Material & Perangkat'},
    {'id': 'cat-ven', 'name': 'Vendor/Jasa'},
    {'id': 'cat-oth', 'name': 'Lain-lain'},
    {'id': 'cat-lab', 'name': 'Tenaga Kerja'},
  ];

  @override
  void initState() {
    super.initState();
    final edit = widget.expenseToEdit;

    _titleController = TextEditingController(text: edit?.displayTitle ?? '');
    _amountController = TextEditingController(
      text: edit != null && edit.amount > 0
          ? RupiahInputFormatter.format(edit.amount)
          : '',
    );
    _noteController = TextEditingController(text: edit?.note ?? '');

    if (edit != null) {
      _selectedCategoryId = edit.categoryId;
      _selectedProjectId = edit.projectId;
      _selectedCostCenterId = edit.costCenterId;
      _selectedTaskId = edit.taskId;
      if (edit.attachments.isNotEmpty) {
        _attachedReceiptPath = edit.attachments.first.url;
      }
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _amountController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  List<Map<String, String>> get _availablePhases {
    if (_selectedProjectId == null) return [];
    final prj = _projects.firstWhere(
      (p) => p['id'] == _selectedProjectId,
      orElse: () => {},
    );
    if (prj.containsKey('phases') && prj['phases'] is List) {
      return (prj['phases'] as List).cast<Map<String, String>>();
    }
    return [];
  }

  List<Map<String, String>> get _availableTasks {
    if (_selectedProjectId == null) return [];
    final prj = _projects.firstWhere(
      (p) => p['id'] == _selectedProjectId,
      orElse: () => {},
    );
    if (prj.containsKey('tasks') && prj['tasks'] is List) {
      return (prj['tasks'] as List).cast<Map<String, String>>();
    }
    return [];
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      if (source == ImageSource.camera) {
        final result = await Navigator.push<String>(
          context,
          MaterialPageRoute(builder: (_) => const CameraScannerPage()),
        );
        if (result != null && mounted) {
          setState(() {
            _attachedReceiptPath = result;
          });
        }
      } else {
        final picker = ImagePicker();
        final picked = await picker.pickImage(source: source, imageQuality: 80);
        if (picked != null && mounted) {
          setState(() {
            _attachedReceiptPath = picked.path;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal memilih gambar: $e')),
        );
      }
    }
  }

  Future<void> _submitOrDraft({required bool isDraft}) async {
    setState(() {
      _errorMessage = null;
    });

    // Validasi Nota
    if (_attachedReceiptPath == null && widget.expenseToEdit == null) {
      setState(() {
        _errorMessage = 'Nota bukti pengeluaran wajib dilampirkan.';
      });
      return;
    }

    // Validasi Form
    if (!_formKey.currentState!.validate()) {
      return;
    }

    final amount = RupiahInputFormatter.parse(_amountController.text);
    if (amount <= 0) {
      setState(() {
        _errorMessage = 'Nominal pengeluaran harus lebih besar dari 0.';
      });
      return;
    }

    if (_selectedCategoryId == null) {
      setState(() {
        _errorMessage = 'Kategori pengeluaran wajib dipilih.';
      });
      return;
    }

    if (_selectedProjectId == null) {
      setState(() {
        _errorMessage = 'Proyek wajib dipilih.';
      });
      return;
    }

    // Dialog Konfirmasi jika Ajukan Langsung
    if (!isDraft) {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (dialogCtx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('Ajukan Pengeluaran?'),
          content: Text(
            'Pengeluaran "${_titleController.text.trim()}" sebesar Rp ${_amountController.text} akan diajukan ke Admin untuk diverifikasi.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogCtx, false),
              child: const Text('Batal'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(dialogCtx, true),
              style: TextButton.styleFrom(foregroundColor: AppColors.primary),
              child: const Text('Ya, Ajukan'),
            ),
          ],
        ),
      );

      if (confirmed != true) return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      final repo = ref.read(expensesRepositoryProvider);

      // Data payload (Menangani catatan #1 Judul & #2 Fase di AGENT_RULES.md)
      final payload = <String, dynamic>{
        'title': _titleController.text.trim(),
        'vendor': _titleController.text.trim(), // Sesuai diskrepansi #1
        'amount': amount,
        'categoryId': _selectedCategoryId,
        'projectId': _selectedProjectId,
        'costCenterId': _selectedCostCenterId ?? 'cc-001',
        if (_selectedTaskId != null) 'taskId': _selectedTaskId,
        'note': _noteController.text.trim().isEmpty
            ? _titleController.text.trim()
            : _noteController.text.trim(),
        'submitNow': !isDraft,
        'expenseDate': DateTime.now().toIso8601String(),
      };

      final ExpenseEntity saved;
      if (widget.expenseToEdit != null) {
        saved = await repo.updateExpense(widget.expenseToEdit!.id, payload);
      } else {
        saved = await repo.createExpense(payload);
      }

      if (!mounted) return;

      if (isDraft) {
        ref.invalidate(expenseListProvider);
        ref.invalidate(expenseCountsProvider);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Draft pengeluaran berhasil disimpan.'),
            backgroundColor: AppColors.primary,
          ),
        );
        Navigator.pop(context);
      } else {
        ref.invalidate(expenseListProvider);
        ref.invalidate(expenseCountsProvider);
        // Navigasi ke Layar Sukses
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => ExpenseSuccessPage(expense: saved),
          ),
        );
      }
    } on AppException catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.message;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Terjadi kesalahan: $e';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEditing = widget.expenseToEdit != null;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.chevron_left_rounded, size: 28),
          color: AppColors.textPrimary,
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          isEditing ? 'Edit Pengeluaran' : 'Ajukan Pengeluaran',
          style: AppTextStyles.h2.copyWith(fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.lg,
                  vertical: AppSpacing.sm,
                ),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Banner Error jika ada
                      if (_errorMessage != null) ...[
                        Container(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          decoration: BoxDecoration(
                            color: AppColors.dangerTint,
                            borderRadius: BorderRadius.circular(12),
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
                                  style: const TextStyle(
                                    color: AppColors.danger,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: AppSpacing.md),
                      ],

                      // 1. Bagian Nota (Wajib)
                      _buildFieldHeader(label: 'Nota', isRequired: true),
                      const SizedBox(height: AppSpacing.xs),
                      if (_attachedReceiptPath == null)
                        _buildReceiptPickerButtons()
                      else
                        _buildAttachedReceiptCard(),
                      const SizedBox(height: AppSpacing.lg),

                      // 2. Field Judul (Wajib)
                      _buildFieldHeader(label: 'Judul', isRequired: true),
                      const SizedBox(height: AppSpacing.xs),
                      TextFormField(
                        controller: _titleController,
                        decoration: InputDecoration(
                          hintText: 'Contoh: Kabel LAN',
                          hintStyle: AppTextStyles.body2.copyWith(
                            color: AppColors.textPlaceholder,
                          ),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 14,
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: AppColors.border),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: AppColors.border),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: AppColors.primary),
                          ),
                          filled: true,
                          fillColor: const Color(0xFFFBFBFC),
                        ),
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) {
                            return 'Judul pengeluaran wajib diisi';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: AppSpacing.lg),

                      // 3. Field Nominal Rp (Wajib, format ribuan)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFBFBFC),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Row(
                          children: [
                            Text(
                              'Rp',
                              style: AppTextStyles.h2.copyWith(
                                color: const Color(0xFF8E6CA6), // Ungu muda
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(width: AppSpacing.md),
                            Expanded(
                              child: TextFormField(
                                controller: _amountController,
                                keyboardType: TextInputType.number,
                                inputFormatters: [RupiahInputFormatter()],
                                style: AppTextStyles.h2.copyWith(
                                  color: AppColors.textPrimary,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 22,
                                ),
                                decoration: const InputDecoration(
                                  border: InputBorder.none,
                                  hintText: '0',
                                ),
                                validator: (val) {
                                  if (val == null || val.trim().isEmpty) {
                                    return 'Nominal wajib diisi';
                                  }
                                  final numVal = RupiahInputFormatter.parse(val);
                                  if (numVal <= 0) {
                                    return 'Nominal harus lebih besar dari 0';
                                  }
                                  return null;
                                },
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.lg),

                      // 4. Dropdown Kategori (Wajib)
                      _buildFieldHeader(label: 'Kategori', isRequired: true),
                      const SizedBox(height: AppSpacing.xs),
                      _buildDropdown(
                        hint: 'Pilih kategori',
                        value: _selectedCategoryId,
                        items: _categories.map((c) {
                          return DropdownMenuItem<String>(
                            value: c['id'],
                            child: Text(c['name']!),
                          );
                        }).toList(),
                        onChanged: (val) {
                          setState(() {
                            _selectedCategoryId = val;
                          });
                        },
                      ),
                      const SizedBox(height: AppSpacing.lg),

                      // 5. Dropdown Proyek (Wajib)
                      _buildFieldHeader(label: 'Proyek', isRequired: true),
                      const SizedBox(height: AppSpacing.xs),
                      _buildDropdown(
                        hint: 'Pilih proyek',
                        value: _selectedProjectId,
                        items: _projects.map((p) {
                          return DropdownMenuItem<String>(
                            value: p['id'] as String,
                            child: Text(p['name'] as String),
                          );
                        }).toList(),
                        onChanged: (val) {
                          setState(() {
                            _selectedProjectId = val;
                            final selected = _projects.firstWhere((p) => p['id'] == val);
                            _selectedCostCenterId = selected['costCenterId'] as String;
                            _selectedPhaseId = null;
                            _selectedTaskId = null;
                          });
                        },
                      ),
                      const SizedBox(height: AppSpacing.lg),

                      // 6. Dropdown Fase (Wajib)
                      _buildFieldHeader(label: 'Fase', isRequired: true),
                      const SizedBox(height: AppSpacing.xs),
                      _buildDropdown(
                        hint: 'Pilih fase',
                        value: _selectedPhaseId,
                        items: _availablePhases.map((ph) {
                          return DropdownMenuItem<String>(
                            value: ph['id'],
                            child: Text(ph['name']!),
                          );
                        }).toList(),
                        onChanged: (val) {
                          setState(() {
                            _selectedPhaseId = val;
                          });
                        },
                      ),
                      const SizedBox(height: AppSpacing.lg),

                      // 7. Dropdown Task (Opsional)
                      _buildFieldHeader(label: 'Task (opsional)', isRequired: false),
                      const SizedBox(height: AppSpacing.xs),
                      _buildDropdown(
                        hint: 'Pilih task',
                        value: _selectedTaskId,
                        items: _availableTasks.map((t) {
                          return DropdownMenuItem<String>(
                            value: t['id'],
                            child: Text(t['title']!),
                          );
                        }).toList(),
                        onChanged: (val) {
                          setState(() {
                            _selectedTaskId = val;
                          });
                        },
                      ),
                      const SizedBox(height: AppSpacing.xl),
                    ],
                  ),
                ),
              ),
            ),

            // Bottom Buttons (Simpan Draft & Ajukan)
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.lg,
                vertical: AppSpacing.md,
              ),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: AppColors.border)),
              ),
              child: Row(
                children: [
                  // Tombol Simpan Draft
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _isSubmitting
                          ? null
                          : () => _submitOrDraft(isDraft: true),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.primary,
                        side: const BorderSide(color: AppColors.primary, width: 1.5),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text(
                        'Simpan Draft',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),

                  // Tombol Ajukan
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _isSubmitting
                          ? null
                          : () => _submitOrDraft(isDraft: false),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: _isSubmitting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Text(
                              'Ajukan',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFieldHeader({required String label, required bool isRequired}) {
    return Row(
      children: [
        Text(
          label,
          style: AppTextStyles.subtitle2.copyWith(
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        if (isRequired) ...[
          const SizedBox(width: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
            decoration: BoxDecoration(
              color: AppColors.dangerTint,
              borderRadius: BorderRadius.circular(4),
            ),
            child: const Text(
              'wajib',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: AppColors.danger,
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildReceiptPickerButtons() {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: const Color(0xFFFBFBFC),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: AppColors.border,
          style: BorderStyle.solid,
        ),
      ),
      child: Row(
        children: [
          // Tombol Pindai Nota
          Expanded(
            child: ElevatedButton.icon(
              onPressed: () => _pickImage(ImageSource.camera),
              icon: const Icon(Icons.document_scanner_outlined, size: 18),
              label: const Text('Pindai Nota'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),

          // Tombol Galeri
          Expanded(
            child: OutlinedButton.icon(
              onPressed: () => _pickImage(ImageSource.gallery),
              icon: const Icon(Icons.photo_library_outlined, size: 18),
              label: const Text('Galeri'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.textPrimary,
                side: const BorderSide(color: AppColors.border),
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAttachedReceiptCard() {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
        boxShadow: AppSpacing.softShadow,
      ),
      child: Row(
        children: [
          // Thumbnail Nota
          Container(
            width: 46,
            height: 52,
            decoration: BoxDecoration(
              color: const Color(0xFFFAF7EE),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFFE8E2D5)),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: _attachedReceiptPath != null &&
                      (_attachedReceiptPath!.startsWith('http') || kIsWeb)
                  ? Image.network(
                      _attachedReceiptPath!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const Icon(
                        Icons.receipt_long_rounded,
                        color: Color(0xFFF29D38),
                      ),
                    )
                  : (_attachedReceiptPath != null
                      ? Image.file(
                          File(_attachedReceiptPath!),
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const Icon(
                            Icons.receipt_long_rounded,
                            color: Color(0xFFF29D38),
                          ),
                        )
                      : const Icon(
                          Icons.receipt_long_rounded,
                          color: Color(0xFFF29D38),
                        )),
            ),
          ),
          const SizedBox(width: AppSpacing.md),

          // Teks Keterangan
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _titleController.text.trim().isNotEmpty
                      ? _titleController.text.trim()
                      : 'Nota Pengeluaran',
                  style: AppTextStyles.subtitle1.copyWith(
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  'Nota terlampir',
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),

          // Tombol Ganti
          OutlinedButton(
            onPressed: () => _pickImage(ImageSource.camera),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.primary,
              side: const BorderSide(color: AppColors.primary),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: const Text('Ganti'),
          ),
        ],
      ),
    );
  }

  Widget _buildDropdown({
    required String hint,
    required String? value,
    required List<DropdownMenuItem<String>> items,
    required ValueChanged<String?> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: BoxDecoration(
        color: const Color(0xFFFBFBFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          isExpanded: true,
          hint: Text(
            hint,
            style: AppTextStyles.body2.copyWith(color: AppColors.textPlaceholder),
          ),
          value: value,
          items: items,
          onChanged: onChanged,
          icon: const Icon(
            Icons.keyboard_arrow_down_rounded,
            color: AppColors.textSecondary,
          ),
        ),
      ),
    );
  }
}

