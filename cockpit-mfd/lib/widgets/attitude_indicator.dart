import 'dart:math';
import 'package:flutter/material.dart';

/// Artificial-horizon style attitude indicator driven by roll/pitch in degrees.
class AttitudeIndicator extends StatelessWidget {
  final double rollDeg;
  final double pitchDeg;
  final double size;

  const AttitudeIndicator({super.key, required this.rollDeg, required this.pitchDeg, this.size = 220});

  @override
  Widget build(BuildContext context) {
    return ClipOval(
      child: CustomPaint(
        painter: _AttitudePainter(rollDeg: rollDeg, pitchDeg: pitchDeg),
        size: Size.square(size),
      ),
    );
  }
}

class _AttitudePainter extends CustomPainter {
  final double rollDeg;
  final double pitchDeg;

  _AttitudePainter({required this.rollDeg, required this.pitchDeg});

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final radius = size.width / 2;

    canvas.save();
    canvas.translate(center.dx, center.dy);
    canvas.rotate(-rollDeg * pi / 180);

    final pitchOffset = pitchDeg * 4;

    final skyPaint = Paint()..color = const Color(0xFF1565C0);
    final groundPaint = Paint()..color = const Color(0xFF6D4C21);
    canvas.drawRect(Rect.fromLTWH(-radius * 2, -radius * 2 + pitchOffset, radius * 4, radius * 2), skyPaint);
    canvas.drawRect(Rect.fromLTWH(-radius * 2, pitchOffset, radius * 4, radius * 2), groundPaint);

    final horizonPaint = Paint()
      ..color = Colors.white
      ..strokeWidth = 2;
    canvas.drawLine(Offset(-radius * 2, pitchOffset), Offset(radius * 2, pitchOffset), horizonPaint);

    canvas.restore();

    final fixedPaint = Paint()
      ..color = Colors.amberAccent
      ..strokeWidth = 3;
    canvas.drawLine(Offset(center.dx - 30, center.dy), Offset(center.dx - 10, center.dy), fixedPaint);
    canvas.drawLine(Offset(center.dx + 10, center.dy), Offset(center.dx + 30, center.dy), fixedPaint);
    canvas.drawCircle(center, 3, fixedPaint);

    final ringPaint = Paint()
      ..color = Colors.white24
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3;
    canvas.drawCircle(center, radius - 2, ringPaint);
  }

  @override
  bool shouldRepaint(covariant _AttitudePainter oldDelegate) =>
      oldDelegate.rollDeg != rollDeg || oldDelegate.pitchDeg != pitchDeg;
}
