export const API_BASE = 'https://summarisable-subarticulative-queenie.ngrok-free.dev';

export const API_HEADERS = {
    'Content-Type':               'application/json',
    'Accept':                     'application/json',
    'ngrok-skip-browser-warning': 'true',
};

export async function apiPost(path, body) {
    const response = await fetch(`${API_BASE}${path}`, {
        method:  'POST',
        headers: API_HEADERS,
        body:    JSON.stringify(body),
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
}

export async function apiGet(path) {
    const response = await fetch(`${API_BASE}${path}`, {
        method:  'GET',
        headers: API_HEADERS,
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
}