package avio.data;

import avio.domain.Route;
import java.util.Optional;

public interface RouteRepository {
    void save(Route route);
    Optional<Route> findById(String id);
}
