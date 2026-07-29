package avio.data;

import avio.domain.FlightData;
import java.util.List;

public interface TelemetryRepository {
    void record(String aircraftId, FlightData data);
    List<FlightData> history(String aircraftId);
    FlightData latest(String aircraftId);
}
