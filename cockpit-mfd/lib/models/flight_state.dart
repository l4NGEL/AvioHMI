import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

/// Holds the aircraft's current telemetry, fed live over a WebSocket from the
/// Mission Computer Core (see core/src/main/java/avio/app/TelemetryServerApp).
/// Reconnects automatically if the Core server isn't up yet or drops.
class FlightState extends ChangeNotifier {
  final String url;

  FlightState({this.url = 'ws://localhost:8765'});

  double speedKts = 0;
  double altitudeMeters = 0;
  double headingDeg = 0;
  double rollDeg = 0;
  double pitchDeg = 0;
  double nextWaypointDistanceKm = 0;
  double etaMinutes = 0;
  double fuelPercent = 100;
  String nextWaypointName = '';
  String callsign = '';
  bool connected = false;

  /// Number of times the link has dropped since this MFD started, for the SYS page.
  int disconnectCount = 0;
  DateTime? lastConnectedAt;

  WebSocketChannel? _channel;
  StreamSubscription? _subscription;
  Timer? _reconnectTimer;
  bool _disposed = false;

  void start() {
    _connect();
  }

  void _connect() {
    if (_disposed) return;
    try {
      final channel = WebSocketChannel.connect(Uri.parse(url));
      _channel = channel;
      _subscription = channel.stream.listen(
        _onMessage,
        onDone: _onDisconnected,
        onError: (_) => _onDisconnected(),
        cancelOnError: true,
      );
    } catch (_) {
      _scheduleReconnect();
    }
  }

  void _onMessage(dynamic raw) {
    if (_disposed) return;
    try {
      final msg = jsonDecode(raw as String) as Map<String, dynamic>;
      if (msg['type'] != 'telemetry') return;

      final data = msg['data'] as Map<String, dynamic>;
      final next = msg['nextWaypoint'] as Map<String, dynamic>;

      speedKts = (data['speedKts'] as num).toDouble();
      altitudeMeters = (data['altitudeMeters'] as num).toDouble();
      headingDeg = (data['headingDeg'] as num).toDouble();
      rollDeg = (data['rollDeg'] as num? ?? 0).toDouble();
      pitchDeg = (data['pitchDeg'] as num? ?? 0).toDouble();
      fuelPercent = (msg['fuelPercent'] as num? ?? fuelPercent).toDouble();
      nextWaypointName = next['name'] as String;
      nextWaypointDistanceKm = (msg['distanceToNextKm'] as num).toDouble();
      etaMinutes = (msg['etaMinutes'] as num? ?? 0).toDouble();
      callsign = (msg['callsign'] as String?) ?? callsign;
      connected = true;
      lastConnectedAt = DateTime.now();
      notifyListeners();
    } catch (_) {
      // Malformed frame; wait for the next one rather than tearing down the connection.
    }
  }

  void _onDisconnected() {
    if (_disposed) return;
    if (connected) disconnectCount++;
    connected = false;
    notifyListeners();
    _scheduleReconnect();
  }

  void _scheduleReconnect() {
    if (_disposed) return;
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(const Duration(seconds: 2), _connect);
  }

  @override
  void dispose() {
    _disposed = true;
    _reconnectTimer?.cancel();
    _subscription?.cancel();
    _channel?.sink.close();
    super.dispose();
  }
}
