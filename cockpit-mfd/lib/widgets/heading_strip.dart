import 'package:flutter/material.dart';

/// Horizontal compass strip shown at the bottom of the MFD.
class HeadingStrip extends StatelessWidget {
  final double headingDeg;

  const HeadingStrip({super.key, required this.headingDeg});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 50,
      decoration: BoxDecoration(
        color: Colors.black,
        border: Border.all(color: Colors.white24),
        borderRadius: BorderRadius.circular(4),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CustomPaint(size: const Size(double.infinity, 50), painter: _HeadingPainter(headingDeg: headingDeg)),
          Positioned(
            top: 2,
            child: Container(width: 2, height: 12, color: Colors.amberAccent),
          ),
        ],
      ),
    );
  }
}

class _HeadingPainter extends CustomPainter {
  final double headingDeg;

  _HeadingPainter({required this.headingDeg});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white38
      ..strokeWidth = 1;
    final center = size.width / 2;
    final pixelsPerDeg = size.width / 60;

    for (int deg = -60; deg <= 60; deg += 10) {
      final tickHeading = (headingDeg + deg) % 360;
      final x = center + deg * pixelsPerDeg;
      canvas.drawLine(Offset(x, size.height - 10), Offset(x, size.height), paint);

      final tp = TextPainter(
        text: TextSpan(
          text: tickHeading.round().toString().padLeft(3, '0'),
          style: const TextStyle(color: Colors.white54, fontSize: 10),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      tp.paint(canvas, Offset(x - tp.width / 2, size.height - 26));
    }
  }

  @override
  bool shouldRepaint(covariant _HeadingPainter oldDelegate) => oldDelegate.headingDeg != headingDeg;
}
