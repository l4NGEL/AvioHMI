// Manual smoke check (not part of the default `flutter test` run): connects
// the real FlightState to a running Core server (core/serve.sh) and confirms
// it receives and parses live telemetry.
//
// Run with: flutter test tool/verify_live_connection.dart
// (uses the flutter_test harness, since FlightState pulls in dart:ui via
// ChangeNotifier and can't run under a bare `dart run`).
import 'package:flutter_test/flutter_test.dart';

import 'package:cockpit_mfd/models/flight_state.dart';

void main() {
  test('FlightState connects to a live Core server and parses telemetry', () async {
    final state = FlightState();
    state.start();

    final stopwatch = Stopwatch()..start();
    while (!state.connected && stopwatch.elapsed < const Duration(seconds: 5)) {
      await Future.delayed(const Duration(milliseconds: 100));
    }

    expect(state.connected, isTrue, reason: 'never connected to ${state.url} — is core/serve.sh running?');
    expect(state.speedKts, greaterThan(0));
    expect(state.nextWaypointName, isNotEmpty);

    // ignore: avoid_print
    print('OK: speedKts=${state.speedKts} altitudeMeters=${state.altitudeMeters} '
        'headingDeg=${state.headingDeg} rollDeg=${state.rollDeg} pitchDeg=${state.pitchDeg} '
        'next=${state.nextWaypointName} distanceKm=${state.nextWaypointDistanceKm} '
        'etaMin=${state.etaMinutes}');

    state.dispose();
  });
}
