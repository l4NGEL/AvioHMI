package avio.service;

import avio.domain.FlightData;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

public final class EventBus {
    private final List<TelemetryListener> listeners = new CopyOnWriteArrayList<>();

    public void subscribe(TelemetryListener listener) {
        listeners.add(listener);
    }

    public void publish(String aircraftId, FlightData data) {
        for (TelemetryListener listener : listeners) {
            listener.onTelemetry(aircraftId, data);
        }
    }
}
