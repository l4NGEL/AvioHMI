/**
 * Core's WS/HTTP ports are fixed, but the host must match whatever host the
 * page itself was loaded from — "localhost" only resolves to the phone
 * itself when Ground Control is opened from a phone at the PC's LAN IP.
 * Scheme follows the page's own protocol so a page served over HTTPS (as
 * required for camera/GPS/compass on a real phone) talks wss/https instead
 * of hitting mixed-content blocking.
 */
const CORE_WS_PORT = 8765;
const CORE_HTTP_PORT = 8766;

const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
const httpScheme = window.location.protocol === 'https:' ? 'https' : 'http';
const host = window.location.hostname;

export const CORE_WS_URL = `${wsScheme}://${host}:${CORE_WS_PORT}`;
export const CORE_HTTP_BASE = `${httpScheme}://${host}:${CORE_HTTP_PORT}`;
