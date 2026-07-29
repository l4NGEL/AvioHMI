import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'models/flight_state.dart';
import 'screens/cockpit_screen.dart';

void main() {
  runApp(const AvioHmiCockpitApp());
}

class AvioHmiCockpitApp extends StatelessWidget {
  const AvioHmiCockpitApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => FlightState()..start(),
      child: MaterialApp(
        title: 'AvioHMI Cockpit MFD',
        debugShowCheckedModeBanner: false,
        theme: ThemeData.dark(useMaterial3: true),
        home: const CockpitScreen(),
      ),
    );
  }
}
