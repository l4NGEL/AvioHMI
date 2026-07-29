# AvioHMI Cockpit MFD

Touch-driven multi-function display for the AvioHMI mission computer. See the
[repository root README](../README.md) for the full picture, architecture,
and screenshots.

```bash
flutter pub get
flutter run          # or: flutter run -d windows / -d chrome
flutter test
```

Connects live to Core's telemetry WebSocket at `ws://localhost:8765` (see
`lib/models/flight_state.dart`), with automatic reconnect and a LINK/NO LINK
indicator in the page-button row. `tool/verify_live_connection.dart` is a
standalone smoke test that confirms a real connection to a running
`core/serve.sh` (run with `flutter test tool/verify_live_connection.dart`).
