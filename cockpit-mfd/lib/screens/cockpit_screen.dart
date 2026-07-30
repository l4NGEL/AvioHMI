import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/flight_state.dart';
import '../widgets/attitude_indicator.dart';
import '../widgets/compass_rose.dart';
import '../widgets/heading_strip.dart';
import '../widgets/tape_gauge.dart';

enum MfdPage { pfd, nav, sys }

const double _overspeedThresholdKts = 430;
const double _lowFuelThresholdPercent = 20;

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
    return Padding(
      padding: const EdgeInsets.all(20),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final compassSize = (constraints.maxHeight * 0.65).clamp(140.0, constraints.maxWidth * 0.7);
          return Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Expanded(
                child: Center(
                  child: CompassRose(headingDeg: flight.headingDeg, size: compassSize),
                ),
              ),
              Text(
                'NEXT: ${flight.nextWaypointName}',
                style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                '${flight.nextWaypointDistanceKm.toStringAsFixed(0)} km  •  ETA ${flight.etaMinutes.toStringAsFixed(0)} min  •  HDG ${flight.headingDeg.toStringAsFixed(0)}°',
                style: const TextStyle(color: Colors.white54, fontSize: 16),
              ),
              const SizedBox(height: 12),
            ],
          );
        },
      ),
    );
  }

  Widget _buildSysPage(FlightState flight) {
    final telemetryRows = <(String, String)>[
      ('Speed', '${flight.speedKts.toStringAsFixed(1)} kt'),
      ('Altitude', '${flight.altitudeMeters.toStringAsFixed(0)} m'),
      ('Heading', '${flight.headingDeg.toStringAsFixed(1)}°'),
      ('Roll', '${flight.rollDeg.toStringAsFixed(1)}°'),
      ('Pitch', '${flight.pitchDeg.toStringAsFixed(1)}°'),
      ('Fuel', '${flight.fuelPercent.toStringAsFixed(0)}%'),
    ];

    final alerts = <String>[
      if (flight.speedKts > _overspeedThresholdKts) 'OVERSPEED — ${flight.speedKts.toStringAsFixed(0)}kt',
      if (flight.fuelPercent < _lowFuelThresholdPercent) 'LOW FUEL — ${flight.fuelPercent.toStringAsFixed(0)}%',
    ];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sysSectionHeader('CONNECTION'),
          _sysStatusRow(
            'Link',
            flight.connected ? 'CONNECTED' : 'RECONNECTING…',
            valueColor: flight.connected ? Colors.greenAccent : Colors.redAccent,
          ),
          _sysStatusRow('Callsign', flight.callsign.isEmpty ? '—' : flight.callsign),
          _sysStatusRow('Link drops', flight.disconnectCount.toString()),
          _sysStatusRow(
            'Last update',
            flight.lastConnectedAt == null
                ? '—'
                : '${flight.lastConnectedAt!.hour.toString().padLeft(2, '0')}:'
                    '${flight.lastConnectedAt!.minute.toString().padLeft(2, '0')}:'
                    '${flight.lastConnectedAt!.second.toString().padLeft(2, '0')}',
          ),
          const SizedBox(height: 20),
          _sysSectionHeader('TELEMETRY'),
          ...telemetryRows.map((r) => _sysStatusRow(r.$1, r.$2)),
          const SizedBox(height: 20),
          _sysSectionHeader('ALERTS'),
          if (alerts.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 6),
              child: Text('No active alerts', style: TextStyle(color: Colors.white38, fontSize: 14)),
            )
          else
            ...alerts.map((a) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.red.shade900.withValues(alpha: 0.3),
                      border: Border.all(color: Colors.redAccent),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(a, style: const TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold, fontFamily: 'monospace')),
                  ),
                )),
        ],
      ),
    );
  }

  Widget _sysSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Container(width: 3, height: 14, color: Colors.greenAccent),
          const SizedBox(width: 8),
          Text(
            title,
            style: const TextStyle(color: Colors.white54, fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.2),
          ),
        ],
      ),
    );
  }

  Widget _sysStatusRow(String label, String value, {Color valueColor = Colors.greenAccent}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.white54, fontSize: 16)),
          Text(value, style: TextStyle(color: valueColor, fontSize: 16, fontFamily: 'monospace')),
        ],
      ),
    );
  }
}
