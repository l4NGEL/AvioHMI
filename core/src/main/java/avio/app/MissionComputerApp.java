package avio.app;

import avio.data.InMemoryRouteRepository;
import avio.data.InMemoryTelemetryRepository;
import avio.data.RouteRepository;
import avio.data.TelemetryRepository;
import avio.domain.FlightData;
import avio.domain.Route;
import avio.domain.Waypoint;
import avio.service.EventBus;
import avio.service.NavigationService;
import avio.service.SensorSimulator;

import java.util.List;

public final class MissionComputerApp {

    public static void main(String[] args) {
        RouteRepository routeRepository = new InMemoryRouteRepository();
        TelemetryRepository telemetryRepository = new InMemoryTelemetryRepository();
        EventBus eventBus = new EventBus();
        NavigationService navigationService = new NavigationService();

        Route route = new Route("RT-1", "Ankara-Istanbul-Izmir-Antalya", List.of(
                new Waypoint("Ankara Esenboga", 40.1281, 32.9951, 950),
                new Waypoint("Istanbul", 41.0082, 28.9784, 1200),
                new Waypoint("Izmir", 38.4192, 27.1287, 1100),
                new Waypoint("Antalya", 36.8969, 30.7133, 900)
        ));
        routeRepository.save(route);

        String aircraftId = "AC-101";
        String callsign = "AVIO101";

        SensorSimulator simulator = new SensorSimulator(route, 420.0);

        eventBus.subscribe((id, data) -> System.out.printf(
                "[%s/%s] %s%n", id, callsign, data));

        eventBus.subscribe((id, data) -> {
            Waypoint next = simulator.getCurrentTarget();
            double distanceKm = navigationService.distanceToMeters(data, next) / 1000.0;
            double etaMin = navigationService.etaMinutes(data, next);
            System.out.printf("  -> next: %s, %.1f km, ETA %.1f min%n", next.getName(), distanceKm, etaMin);
        });

        System.out.println("Mission Computer Core starting simulation for route: " + route.getName());
        while (!simulator.isFinished()) {
            FlightData data = simulator.step(0.25);
            telemetryRepository.record(aircraftId, data);
            eventBus.publish(aircraftId, data);
        }

        FlightData last = telemetryRepository.latest(aircraftId);
        System.out.println("Simulation complete. Final position: " + last);
        System.out.println("Recorded telemetry points: " + telemetryRepository.history(aircraftId).size());
    }
}
