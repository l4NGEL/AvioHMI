package avio.domain;

public final class Aircraft {
    private final String id;
    private final String callsign;

    public Aircraft(String id, String callsign) {
        this.id = id;
        this.callsign = callsign;
    }

    public String getId() { return id; }
    public String getCallsign() { return callsign; }
}
