import 'package:flutter/material.dart';

/// Vertical scrolling tape gauge used for airspeed and altitude, PFD-style.
class TapeGauge extends StatelessWidget {
  final double value;
  final String label;
  final Color accentColor;
  final double step;
  final double width;
  final double height;

  const TapeGauge({
    super.key,
    required this.value,
    required this.label,
    this.accentColor = Colors.greenAccent,
    this.step = 20,
    this.width = 90,
    this.height = 220,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: Colors.black,
        border: Border.all(color: Colors.white24),
        borderRadius: BorderRadius.circular(4),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CustomPaint(
            size: Size(width, height),
            painter: _TapePainter(value: value, step: step, color: accentColor),
          ),
          Positioned(
            top: 4,
            child: Text(label, style: const TextStyle(color: Colors.white54, fontSize: 11)),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(color: Colors.black, border: Border.all(color: accentColor)),
            child: Text(
              value.toStringAsFixed(0),
              style: TextStyle(color: accentColor, fontSize: 20, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }
}

class _TapePainter extends CustomPainter {
  final double value;
  final double step;
  final Color color;

  _TapePainter({required this.value, required this.step, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white38
      ..strokeWidth = 1;
    final textStyle = TextStyle(color: Colors.white38, fontSize: 10);

    final center = size.height / 2;
    final pixelsPerUnit = size.height / (step * 4);

    for (int i = -4; i <= 4; i++) {
      final tickValue = (value / step).round() * step + i * step;
      final y = center - (tickValue - value) * pixelsPerUnit;
      if (y < 20 || y > size.height) continue; // 20px keeps clear of the label at the top
      canvas.drawLine(Offset(size.width - 14, y), Offset(size.width, y), paint);

      final tp = TextPainter(
        text: TextSpan(text: tickValue.toStringAsFixed(0), style: textStyle),
        textDirection: TextDirection.ltr,
      )..layout();
      tp.paint(canvas, Offset(size.width - 20 - tp.width, y - tp.height / 2));
    }
  }

  @override
  bool shouldRepaint(covariant _TapePainter oldDelegate) => oldDelegate.value != value;
}
