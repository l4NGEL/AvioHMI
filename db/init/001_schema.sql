CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE routes (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL
);

CREATE TABLE waypoints (
    id              SERIAL PRIMARY KEY,
    route_id        TEXT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    sequence        INTEGER NOT NULL,
    name            TEXT NOT NULL,
    location        GEOGRAPHY(POINT, 4326) NOT NULL,
    altitude_meters DOUBLE PRECISION NOT NULL,
    UNIQUE (route_id, sequence)
);

CREATE TABLE telemetry (
    id              BIGSERIAL PRIMARY KEY,
    aircraft_id     TEXT NOT NULL,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    location        GEOGRAPHY(POINT, 4326) NOT NULL,
    altitude_meters DOUBLE PRECISION NOT NULL,
    speed_kts       DOUBLE PRECISION NOT NULL,
    heading_deg     DOUBLE PRECISION NOT NULL
);

CREATE INDEX idx_telemetry_aircraft_time ON telemetry (aircraft_id, recorded_at DESC);
