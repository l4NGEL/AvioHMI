package avio;

import avio.domain.FlightData;
import avio.domain.Waypoint;
import avio.service.NavigationService;

import java.time.Instant;

/** Minimal assertion-based smoke test, runnable without a test framework. */
public final class NavigationServiceTest {

    public static void main(String[] args) {
        NavigationService nav = new NavigationService();

        FlightData ankara = new FlightData(Instant.now(), 40.1281, 32.9951, 950, 420, 0);
        Waypoint istanbul = new Waypoint("Istanbul", 41.0082, 28.9784, 1200);

        double distanceKm = nav.distanceToMeters(ankara, istanbul) / 1000.0;
        assertTrue(distanceKm > 300 && distanceKm < 400,
                "Ankara-Istanbul distance should be ~350km, was " + distanceKm);

        double eta = nav.etaMinutes(ankara, istanbul);
        assertTrue(eta > 0 && eta < 60, "ETA should be well under an hour at 420kt, was " + eta);

        System.out.println("NavigationServiceTest: ALL TESTS PASSED");
    }

    private static void assertTrue(boolean condition, String message) {
        if (!condition) {
            throw new AssertionError(message);
        }
    }
}
