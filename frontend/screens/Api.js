// Base URL for all API calls that points to the ngrok tunnel that forwards to our local server
export const API_BASE = 'https://summarisable-subarticulative-queenie.ngrok-free.dev';

export const API_HEADERS = {
    'Content-Type':               'application/json',
    'Accept':                     'application/json',
    'ngrok-skip-browser-warning': 'true',
};

// Wrapper for POST requests that serializes the body and returns a normalized { ok, status, data } object
// so callers don't have to repeat the fetch boilerplate every time
export async function apiPost(path, body) {
    const response = await fetch(`${API_BASE}${path}`, {
        method:  'POST',
        headers: API_HEADERS,
        body:    JSON.stringify(body),
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
}
// Wrapper for GET requests that has same idea as apiPost but without a body
export async function apiGet(path) {
    const response = await fetch(`${API_BASE}${path}`, {
        method:  'GET',
        headers: API_HEADERS,
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
}