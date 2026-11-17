import 'package:flutter_test/flutter_test.dart';
import 'package:damacoflow/features/tasks/domain/entities/task_entity.dart';
import 'package:damacoflow/features/tasks/domain/entities/task_checklist_entity.dart';
import 'package:damacoflow/features/tasks/domain/entities/task_comment_entity.dart';
import 'package:damacoflow/features/tasks/domain/entities/task_attachment_entity.dart';
import 'package:damacoflow/features/dashboard/domain/entities/dashboard_summary_entity.dart';

void main() {
  group('TaskChecklistEntity Model Tests', () {
    test('should parse valid checklist json correctly', () {
      final json = {
        'id': 'chk-1',
        'taskId': 'task-100',
        'text': 'Konfigurasi VLAN Trunk',
        'isDone': true,
      };

      final entity = TaskChecklistEntity.fromJson(json);

      expect(entity.id, 'chk-1');
      expect(entity.taskId, 'task-100');
      expect(entity.text, 'Konfigurasi VLAN Trunk');
      expect(entity.isDone, isTrue);
    });

    test('should handle integer boolean for isDone (1/0)', () {
      final json = {
        'id': 'chk-2',
        'taskId': 'task-100',
        'text': 'Test DHCP Relay',
        'isDone': 0,
      };

      final entity = TaskChecklistEntity.fromJson(json);
      expect(entity.isDone, isFalse);
    });

    test('should serialize to json correctly', () {
      const entity = TaskChecklistEntity(
        id: 'chk-3',
        taskId: 'task-100',
        text: 'Review port switch',
        isDone: false,
      );

      final json = entity.toJson();
      expect(json['id'], 'chk-3');
      expect(json['taskId'], 'task-100');
      expect(json['text'], 'Review port switch');
      expect(json['isDone'], isFalse);
    });
  });

  group('TaskCommentEntity Model Tests', () {
    test('should parse comment json with user relation', () {
      final json = {
        'id': 'com-1',
        'taskId': 'task-100',
        'userId': 'usr-1',
        'body': 'Switch Catalyst sudah terpasang di rak.',
        'createdAt': '2026-10-09T08:30:00.000Z',
        'user': {
          'id': 'usr-1',
          'name': 'Ransink',
          'email': 'ransink@damacoflow.id',
          'avatarUrl': 'https://example.com/avatar.png',
        },
      };

      final entity = TaskCommentEntity.fromJson(json);

      expect(entity.id, 'com-1');
      expect(entity.taskId, 'task-100');
      expect(entity.userId, 'usr-1');
      expect(entity.body, 'Switch Catalyst sudah terpasang di rak.');
      expect(entity.userName, 'Ransink');
      expect(entity.userAvatarUrl, 'https://example.com/avatar.png');
      expect(entity.createdAt.year, 2026);
    });

    test('should handle comment without nested user gracefully', () {
      final json = {
        'id': 'com-2',
        'taskId': 'task-100',
        'userId': 'usr-2',
        'body': 'Catatan tanpa user',
      };

      final entity = TaskCommentEntity.fromJson(json);
      expect(entity.userName, isNull);
      expect(entity.userAvatarUrl, isNull);
    });
  });

  group('TaskAttachmentEntity Model Tests', () {
    test('should parse attachment and format file size correctly', () {
      final json = {
        'id': 'att-1',
        'fileName': 'topologi_vlan.pdf',
        'fileUrl': 'https://example.com/topologi_vlan.pdf',
        'mimeType': 'application/pdf',
        'size': 2048 * 1024, // 2 MB
        'uploadedBy': 'usr-1',
        'createdAt': '2026-10-09T10:00:00.000Z',
      };

      final entity = TaskAttachmentEntity.fromJson(json);

      expect(entity.id, 'att-1');
      expect(entity.fileName, 'topologi_vlan.pdf');
      expect(entity.size, 2097152);
      expect(entity.formattedSize, '2.0 MB');
    });

    test('should format KB size correctly', () {
      final json = {
        'id': 'att-2',
        'fileName': 'catatan.txt',
        'fileUrl': 'https://example.com/catatan.txt',
        'mimeType': 'text/plain',
        'size': 1536, // 1.5 KB
        'uploadedBy': 'usr-1',
      };

      final entity = TaskAttachmentEntity.fromJson(json);
      expect(entity.formattedSize, '1.5 KB');
    });
  });

  group('TaskEntity Model Tests', () {
    test('should parse complete task json with nested objects and decimal hours', () {
      final json = {
        'id': 'task-001',
        'projectId': 'proj-1',
        'phaseId': 'phase-1',
        'title': 'Konfigurasi VLAN Lantai 2',
        'description': 'Setting port switch access dan trunk',
        'assigneeId': 'usr-1',
        'status': 'dikerjakan',
        'priority': 'tinggi',
        'dueDate': '2026-10-15T10:00:00.000Z',
        'estimatedHours': '8.50',
        'createdAt': '2026-10-01T08:00:00.000Z',
        'project': {
          'id': 'proj-1',
          'name': 'Renovasi Lab Jaringan',
        },
        'phase': {
          'id': 'phase-1',
          'name': 'Implementasi Switch',
        },
        'assignee': {
          'id': 'usr-1',
          'name': 'Lilit Sugiarto',
          'email': 'lilit@damacoflow.id',
          'jobTitle': 'Network Engineer',
        },
        'checklists': [
          {'id': 'c-1', 'taskId': 'task-001', 'text': 'Trunk core switch', 'isDone': true},
          {'id': 'c-2', 'taskId': 'task-001', 'text': 'VLAN access port', 'isDone': false},
        ],
        'comments': [
          {
            'id': 'com-1',
            'taskId': 'task-001',
            'userId': 'usr-2',
            'body': 'Siap dikerjakan',
            'createdAt': '2026-10-02T09:00:00.000Z',
            'user': {'name': 'Ransink'}
          }
        ],
        'attachments': [
          {
            'id': 'att-1',
            'fileName': 'diagram.png',
            'fileUrl': 'https://example.com/diagram.png',
            'mimeType': 'image/png',
            'size': 500000,
            'uploadedBy': 'usr-1',
          }
        ],
      };

      final task = TaskEntity.fromJson(json);

      expect(task.id, 'task-001');
      expect(task.title, 'Konfigurasi VLAN Lantai 2');
      expect(task.project?.name, 'Renovasi Lab Jaringan');
      expect(task.phase?.name, 'Implementasi Switch');
      expect(task.assignee?.name, 'Lilit Sugiarto');
      expect(task.status, 'dikerjakan');
      expect(task.priority, 'tinggi');
      expect(task.estimatedHours, 8.5);
      expect(task.checklists.length, 2);
      expect(task.completedChecklistsCount, 1);
      expect(task.totalChecklistsCount, 2);
      expect(task.comments.length, 1);
      expect(task.comments.first.userName, 'Ransink');
      expect(task.attachments.length, 1);
    });

    test('should handle numeric number for estimatedHours safely', () {
      final json = {
        'id': 'task-002',
        'projectId': 'proj-1',
        'title': 'Test Numerical Decimal',
        'status': 'belum_mulai',
        'priority': 'rendah',
        'estimatedHours': 12.75,
      };

      final task = TaskEntity.fromJson(json);
      expect(task.estimatedHours, 12.75);
    });

    test('should handle null/missing optional fields without crashing', () {
      final json = {
        'id': 'task-003',
        'projectId': 'proj-1',
        'title': 'Minimal Task',
        'status': 'belum_mulai',
        'priority': 'sedang',
      };

      final task = TaskEntity.fromJson(json);
      expect(task.description, isNull);
      expect(task.dueDate, isNull);
      expect(task.estimatedHours, isNull);
      expect(task.project, isNull);
      expect(task.phase, isNull);
      expect(task.assignee, isNull);
      expect(task.checklists, isEmpty);
      expect(task.comments, isEmpty);
      expect(task.attachments, isEmpty);
      expect(task.completedChecklistsCount, 0);
    });
  });

  group('DashboardSummaryEntity Tests', () {
    test('should calculate weekly progress fraction and remaining hours correctly', () {
      const summary = DashboardSummaryEntity(
        activeTasksCount: 5,
        dueTasksCount: 3,
        pendingApprovalsCount: 1,
        weeklyFilledHours: 28.0,
        weeklyTargetHours: 40.0,
        hasUnreadNotifications: true,
      );

      expect(summary.weeklyProgressFraction, 28.0 / 40.0);
      expect(summary.remainingWeeklyHours, 12.0);
    });

    test('should parse DashboardExpenseItem correctly with title fallback', () {
      final json = {
        'id': 'exp-1',
        'vendor': 'PT Sarana Solusi',
        'category': {'id': 'cat-1', 'name': 'Perangkat Lunak'},
        'amount': '1250000.00',
        'status': 'menunggu_admin',
        'spentDate': '2026-09-10T00:00:00.000Z',
      };

      final item = DashboardExpenseItem.fromJson(json);
      expect(item.id, 'exp-1');
      expect(item.title, 'PT Sarana Solusi');
      expect(item.categoryName, 'Perangkat Lunak');
      expect(item.amount, 1250000.0);
      expect(item.status, 'menunggu_admin');
    });
  });
}

