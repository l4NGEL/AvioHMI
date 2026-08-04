// host has to match wherever the page was loaded from, not a hardcoded "localhost"
// (that would resolve to the phone itself when opened from a phone on the LAN)
const CORE_WS_PORT = 8765;
const CORE_HTTP_PORT = 8766;

const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
const httpScheme = window.location.protocol === 'https:' ? 'https' : 'http';
const host = window.location.hostname;

export const CORE_WS_URL = `${wsScheme}://${host}:${CORE_WS_PORT}`;
export const CORE_HTTP_BASE = `${httpScheme}://${host}:${CORE_HTTP_PORT}`;
