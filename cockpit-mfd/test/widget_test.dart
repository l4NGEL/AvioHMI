import 'package:flutter_test/flutter_test.dart';

import 'package:cockpit_mfd/main.dart';
import 'package:cockpit_mfd/models/flight_state.dart';

void main() {
  testWidgets('Cockpit MFD shows PFD page with page-select buttons', (WidgetTester tester) async {
    // Inject a FlightState that never calls start(), so the test renders the
    // UI without opening a real socket connection.
    await tester.pumpWidget(AvioHmiCockpitApp(flightState: FlightState()));
    await tester.pump();

    expect(find.text('PFD'), findsOneWidget);
    expect(find.text('NAV'), findsOneWidget);
    expect(find.text('SYS'), findsOneWidget);

    await tester.tap(find.text('NAV'));
    await tester.pump();

    expect(find.textContaining('NEXT:'), findsOneWidget);
  });
}
