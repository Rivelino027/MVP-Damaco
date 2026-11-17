import 'dart:io';
import 'package:flutter/foundation.dart';

class DeviceInfoHelper {
  DeviceInfoHelper._();

  static String getDeviceInfo() {
    if (kIsWeb) return 'DamacoFlow Web Client';
    if (Platform.isAndroid) return 'DamacoFlow Android Client';
    if (Platform.isIOS) return 'DamacoFlow iOS Client';
    if (Platform.isWindows) return 'DamacoFlow Windows Client';
    if (Platform.isMacOS) return 'DamacoFlow macOS Client';
    if (Platform.isLinux) return 'DamacoFlow Linux Client';
    return 'DamacoFlow Mobile Client';
  }
}

