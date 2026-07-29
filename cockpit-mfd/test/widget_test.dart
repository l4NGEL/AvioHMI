import 'package:flutter_test/flutter_test.dart';

import 'package:cockpit_mfd/main.dart';

void main() {
  testWidgets('Cockpit MFD shows PFD page with page-select buttons', (WidgetTester tester) async {
    await tester.pumpWidget(const AvioHmiCockpitApp());
    await tester.pump();

    expect(find.text('PFD'), findsOneWidget);
    expect(find.text('NAV'), findsOneWidget);
    expect(find.text('SYS'), findsOneWidget);

    await tester.tap(find.text('NAV'));
    await tester.pump();

    expect(find.textContaining('NEXT:'), findsOneWidget);
  });
}
