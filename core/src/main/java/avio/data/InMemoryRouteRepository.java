package avio.data;

import avio.domain.Route;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

public final class InMemoryRouteRepository implements RouteRepository {
    private final Map<String, Route> routes = new ConcurrentHashMap<>();

    @Override
    public void save(Route route) {
        routes.put(route.getId(), route);
    }

    @Override
    public Optional<Route> findById(String id) {
        return Optional.ofNullable(routes.get(id));
    }
}
