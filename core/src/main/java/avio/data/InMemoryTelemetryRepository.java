package avio.data;

import avio.domain.FlightData;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

public final class InMemoryTelemetryRepository implements TelemetryRepository {
    private final Map<String, List<FlightData>> byAircraft = new ConcurrentHashMap<>();

    @Override
    public void record(String aircraftId, FlightData data) {
        byAircraft.computeIfAbsent(aircraftId, k -> new CopyOnWriteArrayList<>()).add(data);
    }

    @Override
    public List<FlightData> history(String aircraftId) {
        return Collections.unmodifiableList(byAircraft.getOrDefault(aircraftId, Collections.emptyList()));
    }

    @Override
    public FlightData latest(String aircraftId) {
        List<FlightData> list = byAircraft.get(aircraftId);
        if (list == null || list.isEmpty()) return null;
        return list.get(list.size() - 1);
    }
}
