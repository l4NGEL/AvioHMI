package avio.service;

import avio.domain.FlightData;

public interface TelemetryListener {
    void onTelemetry(String aircraftId, FlightData data);
}
