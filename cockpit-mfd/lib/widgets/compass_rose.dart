import 'dart:math';
import 'package:flutter/material.dart';

/// Heading-up compass rose (HSI-style): the card rotates under a fixed
/// lubber line at top, so "up" always shows the current heading.
class CompassRose extends StatelessWidget {
  final double headingDeg;
  final double size;

  const CompassRose({super.key, required this.headingDeg, this.size = 220});

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: Size.square(size),
      painter: _CompassPainter(headingDeg: headingDeg),
    );
  }
}

class _CompassPainter extends CustomPainter {
  final double headingDeg;

  _CompassPainter({required this.headingDeg});

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final radius = size.width / 2 - 12;

    canvas.drawCircle(center, radius, Paint()..color = Colors.black);
    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..color = Colors.white24
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2,
    );

    canvas.save();
    canvas.translate(center.dx, center.dy);
    canvas.rotate(-headingDeg * pi / 180);

    final tickPaint = Paint()
      ..color = Colors.white54
      ..strokeWidth = 1.5;

    for (int deg = 0; deg < 360; deg += 10) {
      final isCardinal = deg % 90 == 0;
      final isMajor = deg % 30 == 0;
      final tickLength = isCardinal ? 16.0 : (isMajor ? 11.0 : 6.0);
      final angle = deg * pi / 180;
      final outer = Offset(sin(angle) * radius, -cos(angle) * radius);
      final inner = Offset(sin(angle) * (radius - tickLength), -cos(angle) * (radius - tickLength));
      canvas.drawLine(inner, outer, tickPaint);

      if (isMajor) {
        final label = switch (deg) {
          0 => 'N',
          90 => 'E',
          180 => 'S',
          270 => 'W',
          _ => (deg ~/ 10).toString().padLeft(2, '0'),
        };
        final tp = TextPainter(
          text: TextSpan(
            text: label,
            style: TextStyle(
              color: isCardinal ? Colors.greenAccent : Colors.white70,
              fontSize: isCardinal ? 15 : 11,
              fontWeight: FontWeight.bold,
            ),
          ),
          textDirection: TextDirection.ltr,
        )..layout();

        final labelCenter = Offset(sin(angle) * (radius - 26), -cos(angle) * (radius - 26));
        canvas.save();
        canvas.translate(labelCenter.dx, labelCenter.dy);
        canvas.rotate(headingDeg * pi / 180); // counter-rotate so labels stay upright
        tp.paint(canvas, Offset(-tp.width / 2, -tp.height / 2));
        canvas.restore();
      }
    }
    canvas.restore();

    // Fixed lubber line at top (points at current heading, always "up").
    final lubberPaint = Paint()..color = Colors.amberAccent;
    final lubberPath = Path()
      ..moveTo(center.dx, center.dy - radius - 8)
      ..lineTo(center.dx - 7, center.dy - radius + 10)
      ..lineTo(center.dx + 7, center.dy - radius + 10)
      ..close();
    canvas.drawPath(lubberPath, lubberPaint);

    // Center aircraft symbol.
    final acPaint = Paint()
      ..color = Colors.white
      ..strokeWidth = 2.5
      ..style = PaintingStyle.stroke;
    canvas.drawLine(Offset(center.dx - 12, center.dy), Offset(center.dx + 12, center.dy), acPaint);
    canvas.drawLine(Offset(center.dx, center.dy - 8), Offset(center.dx, center.dy + 12), acPaint);
    canvas.drawCircle(center, 2.5, Paint()..color = Colors.white);
  }

  @override
  bool shouldRepaint(covariant _CompassPainter oldDelegate) => oldDelegate.headingDeg != headingDeg;
}
