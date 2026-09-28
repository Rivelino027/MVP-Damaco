class UserModel {
  final String id;
  final String name;
  final String email;
  final String role; // OWNER, PROJECT_MANAGER, PM, MEMBER, FINANCE, CLIENT
  final double hourlyRate;

  UserModel({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.hourlyRate = 0,
  });

  String get normalizedRole {
    if (role == 'PM') return 'PROJECT_MANAGER';
    return role;
  }

  bool get isOwner => normalizedRole == 'OWNER';
  bool get isPM => normalizedRole == 'PROJECT_MANAGER';
  bool get isMember => normalizedRole == 'MEMBER';
  bool get isFinance => normalizedRole == 'FINANCE';
  bool get isClient => normalizedRole == 'CLIENT';

  // Permission Helpers
  bool get canViewProfitability => isOwner;
  bool get canViewMargin => isOwner;
  bool get canViewEmployeeRates => isOwner || isPM || isFinance;
  bool get canCreateProject => isOwner || isPM;
  bool get canEditProjectBudget => isOwner || isPM;
  bool get canApproveExpenses => isOwner || isPM || isFinance;
  bool get canManagePurchaseOrders => isOwner || isFinance;
  bool get canCreateInvoices => isOwner || isFinance;
  bool get canRecordPayments => isOwner || isFinance;
  bool get canAssignTasks => isOwner || isPM;
  bool get canUpdateTaskProgress => isOwner || isPM || isMember; // Finance & Client CANNOT
  bool get canViewFinancialReports => isOwner || isFinance;
  bool get canViewProjectCost => !isClient;

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      role: json['role'] ?? 'MEMBER',
      hourlyRate: (json['hourlyRate'] as num?)?.toDouble() ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'role': role,
      'hourlyRate': hourlyRate,
    };
  }
}
