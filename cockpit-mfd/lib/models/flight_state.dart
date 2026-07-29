import 'dart:async';
import 'dart:math';

import 'package:flutter/foundation.dart';

/// Holds the aircraft's current telemetry and simulates a live sensor feed.
///
/// In a real deployment this would be fed by the Mission Computer Core
/// (see core/) over a WebSocket/gRPC link instead of the internal Timer.
class FlightState extends ChangeNotifier {
  double speedKts = 260;
  double altitudeFt = 8000;
  double headingDeg = 45;
  double rollDeg = 0;
  double pitchDeg = 0;
  double nextWaypointDistanceKm = 120;
  String nextWaypointName = 'Istanbul';

  Timer? _timer;
  final Random _random = Random();

  void start() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(milliseconds: 500), (_) => _tick());
  }

  void _tick() {
    headingDeg = (headingDeg + 1.5) % 360;
    rollDeg = 15 * sin(DateTime.now().millisecondsSinceEpoch / 2000);
    pitchDeg = 4 * sin(DateTime.now().millisecondsSinceEpoch / 3500);
    speedKts += (_random.nextDouble() - 0.5) * 2;
    altitudeFt += (_random.nextDouble() - 0.5) * 20;
    nextWaypointDistanceKm = max(0, nextWaypointDistanceKm - 0.4);
    notifyListeners();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}
