import '../../../../core/network/app_exception.dart';
import '../../domain/entities/task_attachment_entity.dart';
import '../../domain/entities/task_checklist_entity.dart';
import '../../domain/entities/task_comment_entity.dart';
import '../../domain/entities/task_entity.dart';
import '../../domain/repositories/tasks_repository.dart';

class TasksRepositoryMock implements TasksRepository {
  static final DateTime _now = DateTime.now();

  final List<TaskEntity> _tasks = [
    TaskEntity(
      id: 'task-1',
      projectId: 'proj-1',
      phaseId: 'phase-1',
      title: 'Konfigurasi VLAN Lantai 2',
      description:
          'Melakukan konfigurasi VLAN untuk seluruh switch di lantai 2 sesuai segmentasi departemen IT, HR, dan Finance.',
      assigneeId: 'user-1',
      status: 'dikerjakan',
      priority: 'tinggi',
      dueDate: DateTime(_now.year, _now.month, _now.day, 17, 0), // Hari ini
      estimatedHours: 8.0,
      createdAt: _now.subtract(const Duration(days: 3)),
      project: const TaskProject(id: 'proj-1', name: 'Renovasi Lab Jaringan'),
      phase: const TaskPhase(id: 'phase-1', name: 'Implementasi Jaringan'),
      assignee: const TaskAssignee(
        id: 'user-1',
        name: 'Lilit Sugiarto',
        email: 'lilit@damacoflow.id',
        jobTitle: 'Network Engineer',
      ),
      checklists: const [
        TaskChecklistEntity(
          id: 'chk-1',
          taskId: 'task-1',
          text: 'Trunk port uplink ke core switch',
          isDone: true,
        ),
        TaskChecklistEntity(
          id: 'chk-2',
          taskId: 'task-1',
          text: 'Alokasi IP subnet per VLAN',
          isDone: true,
        ),
        TaskChecklistEntity(
          id: 'chk-3',
          taskId: 'task-1',
          text: 'Pengujian konektivitas DHCP Relay',
          isDone: false,
        ),
      ],
      comments: [
        TaskCommentEntity(
          id: 'com-1',
          taskId: 'task-1',
          userId: 'user-2',
          body: 'Switch Cisco 2960 sudah terpasang di rak lantai 2 ya.',
          createdAt: _now.subtract(const Duration(hours: 4)),
          userName: 'Ransink',
        ),
        TaskCommentEntity(
          id: 'com-2',
          taskId: 'task-1',
          userId: 'user-1',
          body: 'Siap, sedang saya proses mapping port.',
          createdAt: _now.subtract(const Duration(hours: 2)),
          userName: 'Lilit Sugiarto',
        ),
      ],
      attachments: [
        TaskAttachmentEntity(
          id: 'att-1',
          fileName: 'vlan_diagram_v2.pdf',
          fileUrl: 'https://example.com/vlan_diagram_v2.pdf',
          mimeType: 'application/pdf',
          size: 1024 * 450,
          uploadedBy: 'user-1',
          createdAt: _now.subtract(const Duration(days: 1)),
        ),
      ],
    ),
    TaskEntity(
      id: 'task-2',
      projectId: 'proj-1',
      phaseId: 'phase-1',
      title: 'Dokumentasi topologi jaringan',
      description:
          'Membuat dokumentasi topologi jaringan fisik dan logis yang diperbarui setelah perombakan ruang server.',
      assigneeId: 'user-1',
      status: 'belum_mulai',
      priority: 'sedang',
      dueDate: DateTime(_now.year, _now.month, _now.day + 10), // 21 Okt
      estimatedHours: 4.0,
      createdAt: _now.subtract(const Duration(days: 2)),
      project: const TaskProject(id: 'proj-1', name: 'Renovasi Lab Jaringan'),
      phase: const TaskPhase(id: 'phase-1', name: 'Dokumentasi'),
      assignee: const TaskAssignee(
        id: 'user-1',
        name: 'Lilit Sugiarto',
        email: 'lilit@damacoflow.id',
      ),
      checklists: const [
        TaskChecklistEntity(
          id: 'chk-4',
          taskId: 'task-2',
          text: 'Export diagram ke PDF dan SVG',
          isDone: false,
        ),
      ],
      comments: const [],
    ),
    TaskEntity(
      id: 'task-3',
      projectId: 'proj-2',
      phaseId: 'phase-2',
      title: 'Setup monitoring server baru',
      description:
          'Instalasi agent Zabbix / Prometheus pada node server baru dan konfigurasi alerting Telegram.',
      assigneeId: 'user-1',
      status: 'belum_mulai',
      priority: 'rendah',
      dueDate: DateTime(_now.year, _now.month, _now.day + 19), // 30 Okt
      estimatedHours: 6.0,
      createdAt: _now.subtract(const Duration(days: 1)),
      project: const TaskProject(id: 'proj-2', name: 'Migrasi Server'),
      phase: const TaskPhase(id: 'phase-2', name: 'Monitoring & Alerting'),
      assignee: const TaskAssignee(
        id: 'user-1',
        name: 'Lilit Sugiarto',
        email: 'lilit@damacoflow.id',
      ),
      checklists: const [],
      comments: const [],
    ),
    TaskEntity(
      id: 'task-4',
      projectId: 'proj-1',
      phaseId: 'phase-1',
      title: 'Backup server utama',
      description:
          'Lakukan full backup snapshot VM dan database sebelum migrasi core switch malam ini.',
      assigneeId: 'user-1',
      status: 'dikerjakan',
      priority: 'sedang',
      dueDate: DateTime(_now.year, _now.month, _now.day + 1), // Besok
      estimatedHours: 2.5,
      createdAt: _now.subtract(const Duration(days: 1)),
      project: const TaskProject(id: 'proj-1', name: 'Renovasi Lab Jaringan'),
      phase: const TaskPhase(id: 'phase-1', name: 'Pemeliharaan'),
      assignee: const TaskAssignee(
        id: 'user-1',
        name: 'Lilit Sugiarto',
        email: 'lilit@damacoflow.id',
      ),
      checklists: const [
        TaskChecklistEntity(
          id: 'chk-5',
          taskId: 'task-4',
          text: 'Verifikasi storage NAS cukup',
          isDone: true,
        ),
        TaskChecklistEntity(
          id: 'chk-6',
          taskId: 'task-4',
          text: 'Jalankan script backup database',
          isDone: false,
        ),
      ],
      comments: const [],
    ),
    TaskEntity(
      id: 'task-5',
      projectId: 'proj-1',
      phaseId: 'phase-1',
      title: 'Review Pengkabelan UTP',
      description:
          'Pemeriksaan hasil sertifikasi fluke test pada seluruh kabel UTP Cat6 yang telah ditarik.',
      assigneeId: 'user-1',
      status: 'review',
      priority: 'sedang',
      dueDate: DateTime(_now.year, _now.month, _now.day), // Hari ini
      estimatedHours: 3.0,
      createdAt: _now.subtract(const Duration(days: 4)),
      project: const TaskProject(id: 'proj-1', name: 'Renovasi Lab Jaringan'),
      phase: const TaskPhase(id: 'phase-1', name: 'Quality Assurance'),
      assignee: const TaskAssignee(
        id: 'user-1',
        name: 'Lilit Sugiarto',
        email: 'lilit@damacoflow.id',
      ),
      checklists: const [
        TaskChecklistEntity(
          id: 'chk-7',
          taskId: 'task-5',
          text: 'Cek channel 1 s/d 24',
          isDone: true,
        ),
        TaskChecklistEntity(
          id: 'chk-8',
          taskId: 'task-5',
          text: 'Tandatangan berita acara pengujian',
          isDone: true,
        ),
      ],
      comments: const [],
    ),
    TaskEntity(
      id: 'task-6',
      projectId: 'proj-1',
      phaseId: 'phase-1',
      title: 'Instalasi Rak Server 42U',
      description:
          'Pemasangan fisik rak server baru di data center lantai dasar.',
      assigneeId: 'user-1',
      status: 'selesai',
      priority: 'tinggi',
      dueDate: DateTime(_now.year, _now.month, _now.day - 2), // Selesai
      estimatedHours: 12.0,
      createdAt: _now.subtract(const Duration(days: 7)),
      project: const TaskProject(id: 'proj-1', name: 'Renovasi Lab Jaringan'),
      phase: const TaskPhase(id: 'phase-1', name: 'Hardware Setup'),
      assignee: const TaskAssignee(
        id: 'user-1',
        name: 'Lilit Sugiarto',
        email: 'lilit@damacoflow.id',
      ),
      checklists: const [],
      comments: const [],
    ),
  ];

  @override
  Future<List<TaskEntity>> getMyTasks({
    String? status,
    String? search,
    String? priority,
    int? page,
    int? limit,
  }) async {
    await Future.delayed(const Duration(milliseconds: 300));
    var result = List<TaskEntity>.from(_tasks);

    if (status != null && status.isNotEmpty && status.toLowerCase() != 'semua') {
      final normStatus = status.toLowerCase().replaceAll(' ', '_');
      result = result.where((t) => t.status.toLowerCase() == normStatus).toList();
    }

    if (search != null && search.trim().isNotEmpty) {
      final query = search.trim().toLowerCase();
      result = result.where((t) {
        final titleMatch = t.title.toLowerCase().contains(query);
        final projMatch = t.project?.name.toLowerCase().contains(query) ?? false;
        return titleMatch || projMatch;
      }).toList();
    }

    if (priority != null && priority.isNotEmpty) {
      result = result.where((t) => t.priority.toLowerCase() == priority.toLowerCase()).toList();
    }

    return result;
  }

  @override
  Future<TaskEntity> getTaskDetail(String id) async {
    await Future.delayed(const Duration(milliseconds: 200));
    final index = _tasks.indexWhere((t) => t.id == id);
    if (index == -1) {
      throw AppException(message: 'Task tidak ditemukan');
    }
    return _tasks[index];
  }

  @override
  Future<TaskEntity> updateTaskStatus(String id, String status) async {
    await Future.delayed(const Duration(milliseconds: 200));
    final index = _tasks.indexWhere((t) => t.id == id);
    if (index == -1) {
      throw AppException(message: 'Task tidak ditemukan');
    }
    final updated = _tasks[index].copyWith(status: status, updatedAt: DateTime.now());
    _tasks[index] = updated;
    return updated;
  }

  @override
  Future<TaskChecklistEntity> createChecklist(String taskId, String text) async {
    await Future.delayed(const Duration(milliseconds: 200));
    final index = _tasks.indexWhere((t) => t.id == taskId);
    if (index == -1) {
      throw AppException(message: 'Task tidak ditemukan');
    }

    final newChecklist = TaskChecklistEntity(
      id: 'chk-${DateTime.now().millisecondsSinceEpoch}',
      taskId: taskId,
      text: text,
      isDone: false,
    );

    final updatedChecklists = List<TaskChecklistEntity>.from(_tasks[index].checklists)..add(newChecklist);
    _tasks[index] = _tasks[index].copyWith(checklists: updatedChecklists);
    return newChecklist;
  }

  @override
  Future<TaskChecklistEntity> updateChecklist(
    String taskId,
    String checklistId, {
    bool? isDone,
    String? text,
  }) async {
    await Future.delayed(const Duration(milliseconds: 150));
    final index = _tasks.indexWhere((t) => t.id == taskId);
    if (index == -1) {
      throw AppException(message: 'Task tidak ditemukan');
    }

    final chkIndex = _tasks[index].checklists.indexWhere((c) => c.id == checklistId);
    if (chkIndex == -1) {
      throw AppException(message: 'Item checklist tidak ditemukan');
    }

    final current = _tasks[index].checklists[chkIndex];
    final updatedItem = current.copyWith(
      isDone: isDone ?? current.isDone,
      text: text ?? current.text,
    );

    final updatedChecklists = List<TaskChecklistEntity>.from(_tasks[index].checklists);
    updatedChecklists[chkIndex] = updatedItem;
    _tasks[index] = _tasks[index].copyWith(checklists: updatedChecklists);
    return updatedItem;
  }

  @override
  Future<void> removeChecklist(String taskId, String checklistId) async {
    await Future.delayed(const Duration(milliseconds: 150));
    final index = _tasks.indexWhere((t) => t.id == taskId);
    if (index == -1) return;

    final updatedChecklists = _tasks[index].checklists.where((c) => c.id != checklistId).toList();
    _tasks[index] = _tasks[index].copyWith(checklists: updatedChecklists);
  }

  @override
  Future<TaskCommentEntity> createComment(String taskId, String body) async {
    await Future.delayed(const Duration(milliseconds: 200));
    final index = _tasks.indexWhere((t) => t.id == taskId);
    if (index == -1) {
      throw AppException(message: 'Task tidak ditemukan');
    }

    final newComment = TaskCommentEntity(
      id: 'com-${DateTime.now().millisecondsSinceEpoch}',
      taskId: taskId,
      userId: 'user-1',
      body: body,
      createdAt: DateTime.now(),
      userName: 'Lilit Sugiarto',
    );

    final updatedComments = List<TaskCommentEntity>.from(_tasks[index].comments)..add(newComment);
    _tasks[index] = _tasks[index].copyWith(comments: updatedComments);
    return newComment;
  }

  @override
  Future<void> removeComment(String taskId, String commentId) async {
    await Future.delayed(const Duration(milliseconds: 150));
    final index = _tasks.indexWhere((t) => t.id == taskId);
    if (index == -1) return;

    final updatedComments = _tasks[index].comments.where((c) => c.id != commentId).toList();
    _tasks[index] = _tasks[index].copyWith(comments: updatedComments);
  }
}

