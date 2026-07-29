import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/flight_state.dart';
import '../widgets/attitude_indicator.dart';
import '../widgets/heading_strip.dart';
import '../widgets/tape_gauge.dart';

enum MfdPage { pfd, nav, sys }

/// Touch-driven Multi-Function Display: page buttons across the top switch
/// between flight, navigation, and system views, mirroring a real cockpit MFD.
class CockpitScreen extends StatefulWidget {
  const CockpitScreen({super.key});

  @override
  State<CockpitScreen> createState() => _CockpitScreenState();
}

class _CockpitScreenState extends State<CockpitScreen> {
  MfdPage _page = MfdPage.pfd;

  @override
  Widget build(BuildContext context) {
    final flight = context.watch<FlightState>();

    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Column(
          children: [
            _buildPageButtons(),
            const Divider(color: Colors.white24, height: 1),
            Expanded(child: _buildPageContent(flight)),
          ],
        ),
      ),
    );
  }

  Widget _buildPageButtons() {
    return Row(
      children: MfdPage.values.map((page) {
        final selected = page == _page;
        return Expanded(
          child: GestureDetector(
            onTap: () => setState(() => _page = page),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 18),
              color: selected ? Colors.green.shade900 : Colors.grey.shade900,
              alignment: Alignment.center,
              child: Text(
                page.name.toUpperCase(),
                style: TextStyle(
                  color: selected ? Colors.greenAccent : Colors.white54,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 2,
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildPageContent(FlightState flight) {
    switch (_page) {
      case MfdPage.pfd:
        return _buildPfdPage(flight);
      case MfdPage.nav:
        return _buildNavPage(flight);
      case MfdPage.sys:
        return _buildSysPage(flight);
    }
  }

  Widget _buildPfdPage(FlightState flight) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Expanded(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              TapeGauge(value: flight.speedKts, label: 'SPD kt', accentColor: Colors.greenAccent, step: 20),
              const SizedBox(width: 16),
              AttitudeIndicator(rollDeg: flight.rollDeg, pitchDeg: flight.pitchDeg),
              const SizedBox(width: 16),
              TapeGauge(value: flight.altitudeFt, label: 'ALT ft', accentColor: Colors.cyanAccent, step: 100),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
          child: HeadingStrip(headingDeg: flight.headingDeg),
        ),
      ],
    );
  }

  Widget _buildNavPage(FlightState flight) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.navigation, color: Colors.greenAccent, size: 64),
          const SizedBox(height: 16),
          Text(
            'NEXT: ${flight.nextWaypointName}',
            style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            '${flight.nextWaypointDistanceKm.toStringAsFixed(0)} km  •  HDG ${flight.headingDeg.toStringAsFixed(0)}°',
            style: const TextStyle(color: Colors.white54, fontSize: 16),
          ),
        ],
      ),
    );
  }

  Widget _buildSysPage(FlightState flight) {
    final rows = <(String, String)>[
      ('Speed', '${flight.speedKts.toStringAsFixed(1)} kt'),
      ('Altitude', '${flight.altitudeFt.toStringAsFixed(0)} ft'),
      ('Heading', '${flight.headingDeg.toStringAsFixed(1)}°'),
      ('Roll', '${flight.rollDeg.toStringAsFixed(1)}°'),
      ('Pitch', '${flight.pitchDeg.toStringAsFixed(1)}°'),
    ];
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: rows
            .map((r) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(r.$1, style: const TextStyle(color: Colors.white54, fontSize: 16)),
                      Text(r.$2, style: const TextStyle(color: Colors.greenAccent, fontSize: 16, fontFamily: 'monospace')),
                    ],
                  ),
                ))
            .toList(),
      ),
    );
  }
}
