import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Backdrop behind the MFD gauges: a static gunmetal panel with brushed-metal
/// streaks, corner rivets, and seam lines, evoking a real cockpit bezel
/// instead of flat black. Painted once (shouldRepaint: false) since none of
/// it depends on flight data.
class PanelBackground extends StatelessWidget {
  final Widget child;

  const PanelBackground({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: RadialGradient(
          center: Alignment(0, -0.3),
          radius: 1.4,
          colors: [Color(0xFF2A2E31), Color(0xFF15171A), Color(0xFF0A0B0C)],
          stops: [0.0, 0.6, 1.0],
        ),
      ),
      child: CustomPaint(
        painter: _PanelTexturePainter(),
        child: child,
      ),
    );
  }
}

class _PanelTexturePainter extends CustomPainter {
  const _PanelTexturePainter();

  static const _rivetInset = 14.0;
  static const _rivetRadius = 3.0;

  @override
  void paint(Canvas canvas, Size size) {
    _paintBrushedStreaks(canvas, size);
    _paintSeams(canvas, size);
    _paintRivets(canvas, size);
    _paintVignette(canvas, size);
  }

  void _paintBrushedStreaks(Canvas canvas, Size size) {
    final rand = math.Random(7);
    final paint = Paint()..strokeWidth = 1;
    for (var i = 0; i < 140; i++) {
      final y = rand.nextDouble() * size.height;
      final x = rand.nextDouble() * size.width;
      final len = 20 + rand.nextDouble() * 60;
      final opacity = 0.015 + rand.nextDouble() * 0.03;
      paint.color = Colors.white.withValues(alpha: opacity);
      canvas.drawLine(Offset(x, y), Offset(x + len, y), paint);
    }
  }

  void _paintSeams(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black.withValues(alpha: 0.5)
      ..strokeWidth = 1.5;
    final highlight = Paint()
      ..color = Colors.white.withValues(alpha: 0.04)
      ..strokeWidth = 1;

    final seamY = size.height * 0.14;
    canvas.drawLine(Offset(0, seamY), Offset(size.width, seamY), paint);
    canvas.drawLine(Offset(0, seamY + 1.5), Offset(size.width, seamY + 1.5), highlight);
  }

  void _paintRivets(Canvas canvas, Size size) {
    final base = Paint()..color = const Color(0xFF3A3F44);
    final shadow = Paint()..color = Colors.black.withValues(alpha: 0.6);
    final highlight = Paint()..color = Colors.white.withValues(alpha: 0.25);

    final corners = [
      const Offset(_rivetInset, _rivetInset),
      Offset(size.width - _rivetInset, _rivetInset),
      Offset(_rivetInset, size.height - _rivetInset),
      Offset(size.width - _rivetInset, size.height - _rivetInset),
    ];

    for (final c in corners) {
      canvas.drawCircle(c + const Offset(0.6, 0.6), _rivetRadius, shadow);
      canvas.drawCircle(c, _rivetRadius, base);
      canvas.drawCircle(c - const Offset(0.6, 0.6), _rivetRadius * 0.4, highlight);
    }
  }

  void _paintVignette(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final paint = Paint()
      ..shader = RadialGradient(
        center: Alignment.center,
        radius: 1.0,
        colors: [Colors.transparent, Colors.black.withValues(alpha: 0.45)],
        stops: const [0.7, 1.0],
      ).createShader(rect);
    canvas.drawRect(rect, paint);
  }

  @override
  bool shouldRepaint(covariant _PanelTexturePainter oldDelegate) => false;
}
