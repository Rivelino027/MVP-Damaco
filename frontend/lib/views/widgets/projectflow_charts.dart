import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../theme/app_colors.dart';

class BudgetVsActualChart extends StatelessWidget {
  const BudgetVsActualChart({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 8,
            runSpacing: 6,
            children: [
              const Text(
                'Budget vs Actual Cost',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textPrimary),
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _legendDot('Budget', AppColors.primary),
                  const SizedBox(width: 12),
                  _legendDot('Actual', AppColors.warning),
                ],
              ),
            ],
          ),
          const SizedBox(height: 20),
          SizedBox(
            height: 180,
            child: BarChart(
              BarChartData(
                alignment: BarChartAlignment.spaceAround,
                maxY: 200,
                barTouchData: BarTouchData(enabled: true),
                titlesData: FlTitlesData(
                  show: true,
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      getTitlesWidget: (val, meta) {
                        const style = TextStyle(color: AppColors.textSecondary, fontSize: 10);
                        switch (val.toInt()) {
                          case 0:
                            return const Text('PRJ-01', style: style);
                          case 1:
                            return const Text('PRJ-02', style: style);
                          case 2:
                            return const Text('PRJ-03', style: style);
                          case 3:
                            return const Text('PRJ-04', style: style);
                          default:
                            return const Text('', style: style);
                        }
                      },
                    ),
                  ),
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 32,
                      getTitlesWidget: (val, meta) {
                        return Text(
                          '${val.toInt()}M',
                          style: const TextStyle(color: AppColors.textMuted, fontSize: 9),
                        );
                      },
                    ),
                  ),
                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                ),
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  getDrawingHorizontalLine: (value) => const FlLine(
                    color: AppColors.borderSubtle,
                    strokeWidth: 1,
                  ),
                ),
                borderData: FlBorderData(show: false),
                barGroups: [
                  BarChartGroupData(x: 0, barRods: [
                    BarChartRodData(toY: 150, color: AppColors.primary, width: 12, borderRadius: BorderRadius.circular(4)),
                    BarChartRodData(toY: 98, color: AppColors.warning, width: 12, borderRadius: BorderRadius.circular(4)),
                  ]),
                  BarChartGroupData(x: 1, barRods: [
                    BarChartRodData(toY: 75, color: AppColors.primary, width: 12, borderRadius: BorderRadius.circular(4)),
                    BarChartRodData(toY: 31, color: AppColors.warning, width: 12, borderRadius: BorderRadius.circular(4)),
                  ]),
                  BarChartGroupData(x: 2, barRods: [
                    BarChartRodData(toY: 120, color: AppColors.primary, width: 12, borderRadius: BorderRadius.circular(4)),
                    BarChartRodData(toY: 110, color: AppColors.danger, width: 12, borderRadius: BorderRadius.circular(4)),
                  ]),
                  BarChartGroupData(x: 3, barRods: [
                    BarChartRodData(toY: 90, color: AppColors.primary, width: 12, borderRadius: BorderRadius.circular(4)),
                    BarChartRodData(toY: 45, color: AppColors.success, width: 12, borderRadius: BorderRadius.circular(4)),
                  ]),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  static Widget _legendDot(String label, Color color) {
    return Row(
      children: [
        Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
      ],
    );
  }
}

class ProgressVsCostChart extends StatelessWidget {
  const ProgressVsCostChart({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 8,
            runSpacing: 6,
            children: [
              const Text(
                'Progress vs Cost Consumption',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textPrimary),
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _legendDot('Physical %', AppColors.success),
                  const SizedBox(width: 12),
                  _legendDot('Cost Burn %', AppColors.danger),
                ],
              ),
            ],
          ),
          const SizedBox(height: 20),
          SizedBox(
            height: 180,
            child: LineChart(
              LineChartData(
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  getDrawingHorizontalLine: (value) => const FlLine(color: AppColors.borderSubtle, strokeWidth: 1),
                ),
                titlesData: FlTitlesData(
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      getTitlesWidget: (val, meta) {
                        const style = TextStyle(color: AppColors.textSecondary, fontSize: 10);
                        switch (val.toInt()) {
                          case 0:
                            return const Text('W1', style: style);
                          case 1:
                            return const Text('W2', style: style);
                          case 2:
                            return const Text('W3', style: style);
                          case 3:
                            return const Text('W4', style: style);
                          case 4:
                            return const Text('W5', style: style);
                          default:
                            return const Text('', style: style);
                        }
                      },
                    ),
                  ),
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 30,
                      getTitlesWidget: (val, meta) => Text('${val.toInt()}%', style: const TextStyle(color: AppColors.textMuted, fontSize: 9)),
                    ),
                  ),
                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                ),
                borderData: FlBorderData(show: false),
                minX: 0,
                maxX: 4,
                minY: 0,
                maxY: 100,
                lineBarsData: [
                  LineChartBarData(
                    spots: const [
                      FlSpot(0, 15),
                      FlSpot(1, 35),
                      FlSpot(2, 50),
                      FlSpot(3, 65),
                      FlSpot(4, 78),
                    ],
                    isCurved: true,
                    color: AppColors.success,
                    barWidth: 3,
                    isStrokeCapRound: true,
                    dotData: const FlDotData(show: false),
                  ),
                  LineChartBarData(
                    spots: const [
                      FlSpot(0, 20),
                      FlSpot(1, 40),
                      FlSpot(2, 58),
                      FlSpot(3, 72),
                      FlSpot(4, 85),
                    ],
                    isCurved: true,
                    color: AppColors.danger,
                    barWidth: 3,
                    isStrokeCapRound: true,
                    dotData: const FlDotData(show: false),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  static Widget _legendDot(String label, Color color) {
    return Row(
      children: [
        Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
      ],
    );
  }
}

class ProjectHealthWidget extends StatelessWidget {
  const ProjectHealthWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Project Health Status',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              SizedBox(
                height: 110,
                width: 110,
                child: PieChart(
                  PieChartData(
                    sectionsSpace: 2,
                    centerSpaceRadius: 30,
                    sections: [
                      PieChartSectionData(value: 8, color: AppColors.success, title: '8', radius: 22, titleStyle: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11)),
                      PieChartSectionData(value: 3, color: AppColors.warning, title: '3', radius: 22, titleStyle: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11)),
                      PieChartSectionData(value: 1, color: AppColors.danger, title: '1', radius: 22, titleStyle: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11)),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  children: [
                    _healthItem('🟢 On Track', '8 Projects', AppColors.success),
                    const SizedBox(height: 8),
                    _healthItem('🟡 At Risk', '3 Projects', AppColors.warning),
                    const SizedBox(height: 8),
                    _healthItem('🔴 Over Budget', '1 Project', AppColors.danger),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  static Widget _healthItem(String title, String subtitle, Color color) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12, color: color)),
        Text(subtitle, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
      ],
    );
  }
}

class MonthlyCashFlowChart extends StatelessWidget {
  const MonthlyCashFlowChart({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 8,
            runSpacing: 6,
            children: [
              const Text(
                'Monthly Cash Flow',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textPrimary),
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _legendDot('Inflow (Paid)', AppColors.success),
                  const SizedBox(width: 12),
                  _legendDot('Outflow (Expenses)', AppColors.danger),
                ],
              ),
            ],
          ),
          const SizedBox(height: 20),
          SizedBox(
            height: 180,
            child: BarChart(
              BarChartData(
                alignment: BarChartAlignment.spaceAround,
                maxY: 150,
                barTouchData: BarTouchData(enabled: true),
                titlesData: FlTitlesData(
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      getTitlesWidget: (val, meta) {
                        const style = TextStyle(color: AppColors.textSecondary, fontSize: 10);
                        switch (val.toInt()) {
                          case 0:
                            return const Text('Jun', style: style);
                          case 1:
                            return const Text('Jul', style: style);
                          case 2:
                            return const Text('Aug', style: style);
                          case 3:
                            return const Text('Sep', style: style);
                          default:
                            return const Text('', style: style);
                        }
                      },
                    ),
                  ),
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 30,
                      getTitlesWidget: (val, meta) => Text('${val.toInt()}M', style: const TextStyle(color: AppColors.textMuted, fontSize: 9)),
                    ),
                  ),
                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                ),
                gridData: FlGridData(show: true, drawVerticalLine: false, getDrawingHorizontalLine: (v) => const FlLine(color: AppColors.borderSubtle, strokeWidth: 1)),
                borderData: FlBorderData(show: false),
                barGroups: [
                  BarChartGroupData(x: 0, barRods: [
                    BarChartRodData(toY: 90, color: AppColors.success, width: 10, borderRadius: BorderRadius.circular(3)),
                    BarChartRodData(toY: 60, color: AppColors.danger, width: 10, borderRadius: BorderRadius.circular(3)),
                  ]),
                  BarChartGroupData(x: 1, barRods: [
                    BarChartRodData(toY: 120, color: AppColors.success, width: 10, borderRadius: BorderRadius.circular(3)),
                    BarChartRodData(toY: 85, color: AppColors.danger, width: 10, borderRadius: BorderRadius.circular(3)),
                  ]),
                  BarChartGroupData(x: 2, barRods: [
                    BarChartRodData(toY: 110, color: AppColors.success, width: 10, borderRadius: BorderRadius.circular(3)),
                    BarChartRodData(toY: 70, color: AppColors.danger, width: 10, borderRadius: BorderRadius.circular(3)),
                  ]),
                  BarChartGroupData(x: 3, barRods: [
                    BarChartRodData(toY: 140, color: AppColors.success, width: 10, borderRadius: BorderRadius.circular(3)),
                    BarChartRodData(toY: 95, color: AppColors.danger, width: 10, borderRadius: BorderRadius.circular(3)),
                  ]),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  static Widget _legendDot(String label, Color color) {
    return Row(
      children: [
        Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
      ],
    );
  }
}
