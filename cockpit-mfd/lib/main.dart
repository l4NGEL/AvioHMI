import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'models/flight_state.dart';
import 'screens/cockpit_screen.dart';

void main() {
  runApp(const AvioHmiCockpitApp());
}

class AvioHmiCockpitApp extends StatelessWidget {
  /// Overridable for tests, so widget tests don't open a real socket
  /// connection (and its internal timers) just to render the UI.
  final FlightState? flightState;

  const AvioHmiCockpitApp({super.key, this.flightState});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => flightState ?? (FlightState()..start()),
      child: MaterialApp(
        title: 'AvioHMI Cockpit MFD',
        debugShowCheckedModeBanner: false,
        theme: ThemeData.dark(useMaterial3: true),
        home: const CockpitScreen(),
      ),
    );
  }
}
