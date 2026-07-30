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
            _buildPageButtons(flight),
            const Divider(color: Colors.white24, height: 1),
            Expanded(child: _buildPageContent(flight)),
          ],
        ),
      ),
    );
  }

  Widget _buildPageButtons(FlightState flight) {
    return Row(
      children: [
        ...MfdPage.values.map((page) {
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
        }),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          color: Colors.grey.shade900,
          alignment: Alignment.center,
          child: Text(
            flight.connected ? '● LINK' : '○ NO LINK',
            style: TextStyle(
              color: flight.connected ? Colors.greenAccent : Colors.redAccent,
              fontSize: 11,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ],
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
      children: [
        Expanded(
          child: Padding(
            padding: const EdgeInsets.all(20),
            // Sizes the gauges directly off the available space (rather than
            // scaling a fixed-size cluster with FittedBox, which letterboxes
            // when the aspect ratio doesn't match) so the whole row genuinely
            // fills the screen edge-to-edge with nothing left unused or hidden.
            child: LayoutBuilder(
              builder: (context, constraints) {
                final gaugeHeight = constraints.maxHeight;
                final attitudeSize = (gaugeHeight).clamp(120.0, constraints.maxWidth * 0.55);
                final remainingWidth = constraints.maxWidth - attitudeSize - 32;
                final tapeWidth = (remainingWidth / 2).clamp(70.0, 220.0);

                return Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    TapeGauge(
                      value: flight.speedKts,
                      label: 'SPD kt',
                      accentColor: Colors.greenAccent,
                      step: 20,
                      width: tapeWidth,
                      height: gaugeHeight,
                    ),
                    const SizedBox(width: 16),
                    AttitudeIndicator(rollDeg: flight.rollDeg, pitchDeg: flight.pitchDeg, size: attitudeSize),
                    const SizedBox(width: 16),
                    TapeGauge(
                      value: flight.altitudeMeters,
                      label: 'ALT m',
                      accentColor: Colors.cyanAccent,
                      step: 100,
                      width: tapeWidth,
                      height: gaugeHeight,
                    ),
                  ],
                );
              },
            ),
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
            '${flight.nextWaypointDistanceKm.toStringAsFixed(0)} km  •  ETA ${flight.etaMinutes.toStringAsFixed(0)} min  •  HDG ${flight.headingDeg.toStringAsFixed(0)}°',
            style: const TextStyle(color: Colors.white54, fontSize: 16),
          ),
        ],
      ),
    );
  }

  Widget _buildSysPage(FlightState flight) {
    final rows = <(String, String)>[
      ('Speed', '${flight.speedKts.toStringAsFixed(1)} kt'),
      ('Altitude', '${flight.altitudeMeters.toStringAsFixed(0)} m'),
      ('Heading', '${flight.headingDeg.toStringAsFixed(1)}°'),
      ('Roll', '${flight.rollDeg.toStringAsFixed(1)}°'),
      ('Pitch', '${flight.pitchDeg.toStringAsFixed(1)}°'),
      ('Link', flight.connected ? 'CONNECTED' : 'RECONNECTING…'),
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
