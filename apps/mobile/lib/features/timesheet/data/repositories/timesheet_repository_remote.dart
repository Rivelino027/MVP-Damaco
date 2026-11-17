import 'package:dio/dio.dart';
import '../../../../core/network/api_endpoints.dart';
import '../../../../core/network/app_exception.dart';
import '../../domain/entities/timesheet_entity.dart';
import '../../domain/repositories/timesheet_repository.dart';

class TimesheetRepositoryRemote implements TimesheetRepository {
  final Dio _dio;

  TimesheetRepositoryRemote(this._dio);

  String _formatDateOnly(DateTime date) {
    return "${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}";
  }

  @override
  Future<TimesheetEntity?> getTimesheetForWeek(DateTime weekStart) async {
    try {
      final weekStartStr = _formatDateOnly(weekStart);
      final response = await _dio.get(
        ApiEndpoints.myTimesheets,
        queryParameters: {'weekStart': weekStartStr},
      );

      final dynamic raw = response.data;
      final List<dynamic> items;
      if (raw is Map<String, dynamic> && raw['data'] is List) {
        items = raw['data'] as List<dynamic>;
      } else if (raw is List) {
        items = raw;
      } else {
        items = [];
      }

      if (items.isEmpty) {
        return null;
      }

      return TimesheetEntity.fromJson(items.first as Map<String, dynamic>);
    } on DioException catch (e) {
      throw AppException.fromDio(e);
    } catch (e) {
      throw AppException(message: e.toString());
    }
  }

  @override
  Future<TimesheetEntity> saveTimesheet(TimesheetEntity timesheet) async {
    try {
      if (timesheet.id.isNotEmpty && !timesheet.id.startsWith('new-')) {
        // Update existing timesheet
        final response = await _dio.put(
          ApiEndpoints.updateTimesheet(timesheet.id),
          data: {
            'entries': timesheet.entries.map((e) => e.toJson()).toList(),
          },
        );
        final dynamic raw = response.data;
        final Map<String, dynamic> item =
            (raw is Map<String, dynamic> && raw.containsKey('data'))
                ? raw['data'] as Map<String, dynamic>
                : raw as Map<String, dynamic>;
        return TimesheetEntity.fromJson(item);
      } else {
        // Create new timesheet
        final response = await _dio.post(
          ApiEndpoints.timesheets,
          data: timesheet.toJson(),
        );
        final dynamic raw = response.data;
        final Map<String, dynamic> item =
            (raw is Map<String, dynamic> && raw.containsKey('data'))
                ? raw['data'] as Map<String, dynamic>
                : raw as Map<String, dynamic>;
        return TimesheetEntity.fromJson(item);
      }
    } on DioException catch (e) {
      throw AppException.fromDio(e);
    } catch (e) {
      throw AppException(message: e.toString());
    }
  }

  @override
  Future<TimesheetEntity> submitTimesheet(String timesheetId) async {
    try {
      final response = await _dio.post(
        ApiEndpoints.submitTimesheet(timesheetId),
      );
      final dynamic raw = response.data;
      final Map<String, dynamic> item =
          (raw is Map<String, dynamic> && raw.containsKey('data'))
              ? raw['data'] as Map<String, dynamic>
              : raw as Map<String, dynamic>;
      return TimesheetEntity.fromJson(item);
    } on DioException catch (e) {
      throw AppException.fromDio(e);
    } catch (e) {
      throw AppException(message: e.toString());
    }
  }
}

