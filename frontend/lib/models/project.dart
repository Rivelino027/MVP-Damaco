class ProjectModel {
  final String id;
  final String code;
  final String name;
  final String? description;
  final String status;
  final String? clientId;
  final String clientName;
  final double budgetTotal;
  final double? actualLaborCost;
  final double actualExpenseCost;
  final double actualTotalCost;
  final double remainingBudget;
  final int progressPct;
  final int burnPct;
  final bool isOverburn;
  final DateTime? startDate;
  final DateTime? endDate;
  final double? ev;
  final double ac;
  final double? cpi;
  final double? eac;
  final double totalInvoiced;
  final double totalPaidInvoice;
  final List<PhaseModel> phases;

  ProjectModel({
    required this.id,
    required this.code,
    required this.name,
    this.description,
    required this.status,
    this.clientId,
    required this.clientName,
    required this.budgetTotal,
    this.actualLaborCost,
    required this.actualExpenseCost,
    required this.actualTotalCost,
    required this.remainingBudget,
    required this.progressPct,
    required this.burnPct,
    required this.isOverburn,
    this.startDate,
    this.endDate,
    this.ev,
    required this.ac,
    this.cpi,
    this.eac,
    required this.totalInvoiced,
    required this.totalPaidInvoice,
    required this.phases,
  });

  factory ProjectModel.fromJson(Map<String, dynamic> json) {
    var phasesJson = json['phases'] as List? ?? [];
    List<PhaseModel> phaseList = phasesJson.map((p) => PhaseModel.fromJson(p)).toList();

    DateTime? parseDate(dynamic v) {
      if (v == null) return null;
      if (v is DateTime) return v;
      return DateTime.tryParse(v.toString());
    }

    final code = json['projectCode']?.toString() ?? json['code']?.toString() ?? '';
    final budget = (json['contractValue'] as num?)?.toDouble() ?? (json['budgetTotal'] as num?)?.toDouble() ?? 0.0;
    final progress = (json['progressPercentage'] as num?)?.toInt() ?? (json['progressPct'] as num?)?.toInt() ?? 0;
    final cName = json['client']?['companyName']?.toString() ?? json['client']?['name']?.toString() ?? json['clientName']?.toString() ?? 'Klien';
    final cId = json['clientId']?.toString() ?? json['client']?['id']?.toString();

    return ProjectModel(
      id: json['id']?.toString() ?? '',
      code: code,
      name: json['name']?.toString() ?? '',
      description: json['description']?.toString(),
      status: json['status']?.toString() ?? 'IN_PROGRESS',
      clientId: cId,
      clientName: cName,
      budgetTotal: budget,
      actualLaborCost: (json['actualLaborCost'] as num?)?.toDouble(),
      actualExpenseCost: (json['actualExpenseCost'] as num?)?.toDouble() ?? 0,
      actualTotalCost: (json['actualTotalCost'] as num?)?.toDouble() ?? 0,
      remainingBudget: (json['remainingBudget'] as num?)?.toDouble() ?? (budget - ((json['actualTotalCost'] as num?)?.toDouble() ?? 0)),
      progressPct: progress,
      burnPct: (json['burnPct'] as num?)?.toInt() ?? 0,
      isOverburn: json['isOverburn'] ?? false,
      startDate: parseDate(json['startDate']),
      endDate: parseDate(json['endDate']),
      ev: (json['ev'] as num?)?.toDouble(),
      ac: (json['ac'] as num?)?.toDouble() ?? 0,
      cpi: (json['cpi'] as num?)?.toDouble(),
      eac: (json['eac'] as num?)?.toDouble(),
      totalInvoiced: (json['totalInvoiced'] as num?)?.toDouble() ?? 0,
      totalPaidInvoice: (json['totalPaidInvoice'] as num?)?.toDouble() ?? 0,
      phases: phaseList,
    );
  }
}

class PhaseModel {
  final String id;
  final String projectId;
  final String name;
  final String? description;
  final double budgetTotal;
  final double actualLaborCost;
  final double actualExpenseCost;
  final double actualTotalCost;
  final int progressPct;
  final int burnPct;
  final bool isOverburn;
  final String status;
  final int taskCount;
  final int completedTaskCount;
  final List<TaskModel> tasks;

  PhaseModel({
    required this.id,
    required this.projectId,
    required this.name,
    this.description,
    required this.budgetTotal,
    required this.actualLaborCost,
    required this.actualExpenseCost,
    required this.actualTotalCost,
    required this.progressPct,
    required this.burnPct,
    required this.isOverburn,
    required this.status,
    required this.taskCount,
    required this.completedTaskCount,
    required this.tasks,
  });

  factory PhaseModel.fromJson(Map<String, dynamic> json) {
    var tasksJson = json['tasks'] as List? ?? [];
    List<TaskModel> taskList = tasksJson.map((t) => TaskModel.fromJson(t)).toList();

    return PhaseModel(
      id: json['id']?.toString() ?? '',
      projectId: json['projectId']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      description: json['description']?.toString(),
      budgetTotal: (json['budgetAmount'] as num?)?.toDouble() ?? (json['budgetTotal'] as num?)?.toDouble() ?? 0,
      actualLaborCost: (json['actualLaborCost'] as num?)?.toDouble() ?? 0,
      actualExpenseCost: (json['actualExpenseCost'] as num?)?.toDouble() ?? 0,
      actualTotalCost: (json['actualTotalCost'] as num?)?.toDouble() ?? 0,
      progressPct: (json['progressPercentage'] as num?)?.toInt() ?? (json['progressPct'] as num?)?.toInt() ?? 0,
      burnPct: (json['burnPct'] as num?)?.toInt() ?? 0,
      isOverburn: json['isOverburn'] ?? false,
      status: json['status']?.toString() ?? 'IN_PROGRESS',
      taskCount: (json['taskCount'] as num?)?.toInt() ?? taskList.length,
      completedTaskCount: (json['completedTaskCount'] as num?)?.toInt() ?? taskList.where((t) => t.status == 'COMPLETED').length,
      tasks: taskList,
    );
  }
}

class TaskModel {
  final String id;
  final String projectId;
  final String phaseId;
  final String? phaseName;
  final String? projectName;
  final String title;
  final String? description;
  final String status;
  final String priority;
  final String? assignedToId;
  final String? assigneeName;
  final double estHours;
  final double loggedHours;
  final double laborCost;
  final int progressPct;
  final DateTime? startDate;
  final DateTime? dueDate;

  TaskModel({
    required this.id,
    required this.projectId,
    required this.phaseId,
    this.phaseName,
    this.projectName,
    required this.title,
    this.description,
    required this.status,
    required this.priority,
    this.assignedToId,
    this.assigneeName,
    required this.estHours,
    required this.loggedHours,
    required this.laborCost,
    required this.progressPct,
    this.startDate,
    this.dueDate,
  });

  factory TaskModel.fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(dynamic v) {
      if (v == null) return null;
      if (v is DateTime) return v;
      return DateTime.tryParse(v.toString());
    }

    final assigneeName = json['assignedTo']?['name']?.toString() ?? json['assignee']?['name']?.toString() ?? json['assigneeName']?.toString();
    final assigneeId = json['assignedToId']?.toString() ?? json['assignedTo']?['id']?.toString();
    final phaseName = json['phase']?['name']?.toString() ?? json['phaseName']?.toString();
    final projectName = json['project']?['name']?.toString() ?? json['projectName']?.toString();

    return TaskModel(
      id: json['id']?.toString() ?? '',
      projectId: json['projectId']?.toString() ?? '',
      phaseId: json['phaseId']?.toString() ?? '',
      phaseName: phaseName,
      projectName: projectName,
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString(),
      status: json['status']?.toString() ?? 'TODO',
      priority: json['priority']?.toString() ?? 'MEDIUM',
      assignedToId: assigneeId,
      assigneeName: assigneeName,
      estHours: (json['estimatedHours'] as num?)?.toDouble() ?? (json['estHours'] as num?)?.toDouble() ?? 0,
      loggedHours: (json['actualHours'] as num?)?.toDouble() ?? (json['loggedHours'] as num?)?.toDouble() ?? 0,
      laborCost: (json['actualCost'] as num?)?.toDouble() ?? (json['laborCost'] as num?)?.toDouble() ?? 0,
      progressPct: (json['progressPercentage'] as num?)?.toInt() ?? (json['progressPct'] as num?)?.toInt() ?? 0,
      startDate: parseDate(json['startDate']),
      dueDate: parseDate(json['dueDate']),
    );
  }
}
