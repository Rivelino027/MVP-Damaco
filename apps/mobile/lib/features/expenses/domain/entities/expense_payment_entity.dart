import '../../../../core/utils/decimal_converter.dart';

class ExpensePaymentEntity {
  final String id;
  final String expenseId;
  final String paidBy;
  final String? paidByName;
  final DateTime paidAt;
  final String method; // 'transfer', 'tunai'
  final String? referenceNo;
  final double amount;

  const ExpensePaymentEntity({
    required this.id,
    required this.expenseId,
    required this.paidBy,
    this.paidByName,
    required this.paidAt,
    required this.method,
    this.referenceNo,
    required this.amount,
  });

  factory ExpensePaymentEntity.fromJson(Map<String, dynamic> json) {
    double parsedAmount = 0.0;
    if (json['amount'] != null) {
      final str = DecimalConverter.toDecimalString(json['amount']);
      parsedAmount = double.tryParse(str) ?? 0.0;
    }

    return ExpensePaymentEntity(
      id: json['id']?.toString() ?? '',
      expenseId: json['expenseId']?.toString() ?? '',
      paidBy: json['paidBy']?.toString() ?? '',
      paidByName: json['paidByName']?.toString(),
      paidAt: json['paidAt'] != null
          ? DateTime.tryParse(json['paidAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
      method: json['method']?.toString() ?? 'transfer',
      referenceNo: json['referenceNo']?.toString(),
      amount: parsedAmount,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'expenseId': expenseId,
        'paidBy': paidBy,
        if (paidByName != null) 'paidByName': paidByName,
        'paidAt': paidAt.toIso8601String(),
        'method': method,
        if (referenceNo != null) 'referenceNo': referenceNo,
        'amount': amount,
      };

  String get displayMethod {
    if (method.toLowerCase() == 'transfer') {
      return 'Transfer Bank';
    }
    if (method.toLowerCase() == 'tunai') {
      return 'Tunai / Kas';
    }
    return method;
  }
}

