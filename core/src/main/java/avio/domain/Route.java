package avio.domain;

import java.util.Collections;
import java.util.List;

public final class Route {
    private final String id;
    private final String name;
    private final List<Waypoint> waypoints;

    public Route(String id, String name, List<Waypoint> waypoints) {
        if (waypoints == null || waypoints.size() < 2) {
            throw new IllegalArgumentException("A route needs at least two waypoints");
        }
        this.id = id;
        this.name = name;
        this.waypoints = Collections.unmodifiableList(waypoints);
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public List<Waypoint> getWaypoints() { return waypoints; }
}
