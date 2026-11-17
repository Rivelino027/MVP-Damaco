import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/error_state.dart';
import '../../../../core/widgets/priority_chip.dart';
import '../../../../core/widgets/skeleton_list.dart';
import '../../../../core/widgets/status_chip.dart';
import '../../domain/entities/task_entity.dart';
import '../providers/tasks_provider.dart';

class TaskDetailPage extends ConsumerStatefulWidget {
  final String taskId;

  const TaskDetailPage({
    super.key,
    required this.taskId,
  });

  @override
  ConsumerState<TaskDetailPage> createState() => _TaskDetailPageState();
}

class _TaskDetailPageState extends ConsumerState<TaskDetailPage> {
  final TextEditingController _checklistController = TextEditingController();
  final TextEditingController _commentController = TextEditingController();
  bool _isAddingChecklist = false;
  bool _isAddingComment = false;

  @override
  void dispose() {
    _checklistController.dispose();
    _commentController.dispose();
    super.dispose();
  }

  void _onToggleChecklist(String checklistId, bool currentDone) {
    ref
        .read(taskDetailProvider(widget.taskId).notifier)
        .toggleChecklist(checklistId, !currentDone);
  }

  Future<void> _onAddChecklist() async {
    final text = _checklistController.text.trim();
    if (text.isEmpty) return;
    setState(() => _isAddingChecklist = true);
    try {
      await ref
          .read(taskDetailProvider(widget.taskId).notifier)
          .addChecklist(text);
      _checklistController.clear();
    } finally {
      if (mounted) setState(() => _isAddingChecklist = false);
    }
  }

  Future<void> _onAddComment() async {
    final text = _commentController.text.trim();
    if (text.isEmpty) return;
    setState(() => _isAddingComment = true);
    try {
      await ref
          .read(taskDetailProvider(widget.taskId).notifier)
          .addComment(text);
      _commentController.clear();
      if (mounted) {
        FocusScope.of(context).unfocus();
      }
    } finally {
      if (mounted) setState(() => _isAddingComment = false);
    }
  }

  void _showStatusPicker(BuildContext context, String currentStatus) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        final statuses = [
          {'key': 'belum_mulai', 'label': 'Belum Mulai'},
          {'key': 'dikerjakan', 'label': 'Dikerjakan'},
          {'key': 'review', 'label': 'Review'},
          {'key': 'selesai', 'label': 'Selesai'},
        ];

        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                  child: Text(
                    'Ubah Status Task',
                    style: AppTextStyles.h3.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                const Divider(),
                ...statuses.map((s) {
                  final isSelected = s['key'] == currentStatus;
                  return ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 20),
                    leading: StatusChip(status: s['key']!),
                    trailing: isSelected
                        ? const Icon(Icons.check_rounded, color: AppColors.primary)
                        : null,
                    onTap: () {
                      Navigator.pop(ctx);
                      ref
                          .read(taskDetailProvider(widget.taskId).notifier)
                          .updateStatus(s['key']!);
                    },
                  );
                }),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final taskAsync = ref.watch(taskDetailProvider(widget.taskId));

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Detail Task'),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
      ),
      body: taskAsync.when(
        loading: () => const SingleChildScrollView(
          padding: EdgeInsets.all(AppSpacing.screenPaddingHorizontal),
          child: SkeletonList(itemCount: 4, itemHeight: 120),
        ),
        error: (err, stack) => Center(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.screenPaddingHorizontal),
            child: ErrorState(
              message: err.toString(),
              onRetry: () {
                ref.invalidate(taskDetailProvider(widget.taskId));
              },
            ),
          ),
        ),
        data: (task) => _buildDetailContent(context, task),
      ),
    );
  }

  Widget _buildDetailContent(BuildContext context, TaskEntity task) {
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(AppSpacing.screenPaddingHorizontal),
            children: [
              // 1. Header Card (Judul, Proyek, Fase, Status, Prioritas)
              _buildHeaderCard(task),
              const SizedBox(height: 16),

              // 2. Deskripsi Task
              _buildDescriptionCard(task),
              const SizedBox(height: 16),

              // 3. Metadata (Tenggat & Estimasi Jam)
              _buildMetadataCard(task),
              const SizedBox(height: 16),

              // 4. Checklist Section
              _buildChecklistSection(task),
              const SizedBox(height: 16),

              // 5. Lampiran Section
              if (task.attachments.isNotEmpty) ...[
                _buildAttachmentsSection(task),
                const SizedBox(height: 16),
              ],

              // 6. Komentar Section
              _buildCommentsSection(task),
              const SizedBox(height: 24),
            ],
          ),
        ),

        // Bottom Comment Input Bar
        _buildBottomCommentBar(),
      ],
    );
  }

  Widget _buildHeaderCard(TaskEntity task) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: AppSpacing.roundedCard,
        border: Border.all(color: AppColors.cardBorder),
        boxShadow: AppSpacing.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              PriorityChip(priority: task.priority),
              const SizedBox(width: 8),
              StatusChip(status: task.status),
              const Spacer(),
              // Tombol ubah status
              InkWell(
                onTap: () => _showStatusPicker(context, task.status),
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withAlpha(20),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.edit_note_rounded, size: 14, color: AppColors.primary),
                      const SizedBox(width: 4),
                      Text(
                        'Ubah Status',
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w700,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            task.title,
            style: AppTextStyles.h2.copyWith(
              color: AppColors.textPrimary,
              fontSize: 19,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.folder_outlined, size: 14, color: AppColors.textSecondary),
              const SizedBox(width: 6),
              Text(
                task.project?.name ?? 'Proyek Tanpa Nama',
                style: AppTextStyles.bodySmall.copyWith(
                  color: AppColors.textSecondary,
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (task.phase != null) ...[
                const SizedBox(width: 8),
                const Text('•', style: TextStyle(color: AppColors.textSecondary)),
                const SizedBox(width: 8),
                Text(
                  task.phase!.name,
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDescriptionCard(TaskEntity task) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: AppSpacing.roundedCard,
        border: Border.all(color: AppColors.cardBorder),
        boxShadow: AppSpacing.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Deskripsi',
            style: AppTextStyles.bodyMedium.copyWith(
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            task.description?.isNotEmpty == true
                ? task.description!
                : 'Tidak ada deskripsi tambahan.',
            style: AppTextStyles.bodySmall.copyWith(
              color: task.description?.isNotEmpty == true
                  ? AppColors.textPrimary
                  : AppColors.textSecondary,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetadataCard(TaskEntity task) {
    final dueDateFormatted = DateFormatter.formatFullDayAndDate(task.dueDate);
    final hours = task.estimatedHours != null
        ? '${task.estimatedHours!.toStringAsFixed(task.estimatedHours! % 1 == 0 ? 0 : 1)} Jam'
        : '-';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: AppSpacing.roundedCard,
        border: Border.all(color: AppColors.cardBorder),
        boxShadow: AppSpacing.cardShadow,
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFE8FC),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.calendar_month_rounded, size: 18, color: AppColors.primary),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Tenggat Waktu',
                    style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
                  ),
                  Text(
                    dueDateFormatted,
                    style: AppTextStyles.bodyMedium.copyWith(
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const Divider(height: 20),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3E6),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.timer_outlined, size: 18, color: Color(0xFFD97706)),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Estimasi Waktu',
                    style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
                  ),
                  Text(
                    hours,
                    style: AppTextStyles.bodyMedium.copyWith(
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildChecklistSection(TaskEntity task) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: AppSpacing.roundedCard,
        border: Border.all(color: AppColors.cardBorder),
        boxShadow: AppSpacing.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Checklist',
                style: AppTextStyles.bodyMedium.copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              Text(
                '${task.completedChecklistsCount}/${task.totalChecklistsCount} selesai',
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.textSecondary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (task.checklists.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Text(
                'Belum ada item checklist.',
                style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary),
              ),
            )
          else
            ...task.checklists.map((chk) {
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    SizedBox(
                      width: 24,
                      height: 24,
                      child: Checkbox(
                        value: chk.isDone,
                        activeColor: AppColors.primary,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                        onChanged: (val) {
                          _onToggleChecklist(chk.id, chk.isDone);
                        },
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        chk.text,
                        style: AppTextStyles.bodySmall.copyWith(
                          decoration: chk.isDone ? TextDecoration.lineThrough : null,
                          color: chk.isDone ? AppColors.textSecondary : AppColors.textPrimary,
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }),
          const SizedBox(height: 12),
          // Input Tambah Checklist
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _checklistController,
                  decoration: InputDecoration(
                    hintText: 'Tambah item checklist...',
                    hintStyle: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: AppColors.cardBorder),
                    ),
                    isDense: true,
                  ),
                  onSubmitted: (_) => _onAddChecklist(),
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: _isAddingChecklist ? null : _onAddChecklist,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                child: _isAddingChecklist
                    ? const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Tambah', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAttachmentsSection(TaskEntity task) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: AppSpacing.roundedCard,
        border: Border.all(color: AppColors.cardBorder),
        boxShadow: AppSpacing.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Lampiran (${task.attachments.length})',
            style: AppTextStyles.bodyMedium.copyWith(
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 10),
          ...task.attachments.map((att) {
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF7F5FA),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: Row(
                children: [
                  const Icon(Icons.insert_drive_file_outlined, size: 22, color: AppColors.primary),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          att.fileName,
                          style: AppTextStyles.bodySmall.copyWith(
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          att.formattedSize,
                          style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildCommentsSection(TaskEntity task) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: AppSpacing.roundedCard,
        border: Border.all(color: AppColors.cardBorder),
        boxShadow: AppSpacing.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Komentar (${task.comments.length})',
            style: AppTextStyles.bodyMedium.copyWith(
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          if (task.comments.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Text(
                'Belum ada komentar untuk task ini.',
                style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary),
              ),
            )
          else
            ...task.comments.map((com) {
              final initial = (com.userName?.isNotEmpty == true)
                  ? com.userName![0].toUpperCase()
                  : 'U';
              final timeStr = DateFormatter.formatRelative(com.createdAt);

              return Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CircleAvatar(
                      radius: 16,
                      backgroundColor: const Color(0xFFEFE8FC),
                      child: Text(
                        initial,
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                com.userName ?? 'Pengguna',
                                style: AppTextStyles.bodySmall.copyWith(
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              Text(
                                timeStr,
                                style: AppTextStyles.caption.copyWith(
                                  color: AppColors.textSecondary,
                                  fontSize: 10.5,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            com.body,
                            style: AppTextStyles.bodySmall.copyWith(
                              color: AppColors.textPrimary,
                              height: 1.35,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _buildBottomCommentBar() {
    return Container(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.screenPaddingHorizontal,
        10,
        AppSpacing.screenPaddingHorizontal,
        MediaQuery.of(context).padding.bottom + 10,
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        border: const Border(top: BorderSide(color: AppColors.cardBorder)),
        boxShadow: AppSpacing.bottomNavShadow,
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _commentController,
              decoration: InputDecoration(
                hintText: 'Tulis komentar...',
                hintStyle: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                filled: true,
                fillColor: const Color(0xFFF7F5FA),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(20),
                  borderSide: BorderSide.none,
                ),
                isDense: true,
              ),
              minLines: 1,
              maxLines: 4,
            ),
          ),
          const SizedBox(width: 8),
          IconButton(
            onPressed: _isAddingComment ? null : _onAddComment,
            style: IconButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.all(10),
            ),
            icon: _isAddingComment
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.send_rounded, size: 18),
          ),
        ],
      ),
    );
  }
}
