const SESSION_KEY = "seyir-trakt-session";
const STATE_KEY = "seyir-trakt-oauth-state";
const TRAKT_API = "https://api.trakt.tv";
const TRAKT_AUTHORIZE = "https://trakt.tv/oauth/authorize";

const normalizeBaseUrl = value => value?.trim().replace(/\/$/, "") || "";

function randomState() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function readStoredSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function createTraktClient({ clientId, authBaseUrl, redirectUri }) {
  const normalizedClientId = clientId?.trim() || "";
  const normalizedAuthBaseUrl = normalizeBaseUrl(authBaseUrl);
  let session = readStoredSession();

  const configured = Boolean(normalizedClientId && normalizedAuthBaseUrl);

  function saveSession(nextSession) {
    session = nextSession;
    if (nextSession) localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    else localStorage.removeItem(SESSION_KEY);
  }

  async function authRequest(path, body) {
    const response = await fetch(`${normalizedAuthBaseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error_description || payload.error || "Trakt bağlantısı tamamlanamadı.");
    return payload;
  }

  function beginAuthorization() {
    if (!configured) throw new Error("Trakt OAuth yapılandırması henüz tamamlanmadı.");
    const state = randomState();
    sessionStorage.setItem(STATE_KEY, state);
    const query = new URLSearchParams({
      response_type: "code",
      client_id: normalizedClientId,
      redirect_uri: redirectUri,
      state
    });
    window.location.assign(`${TRAKT_AUTHORIZE}?${query}`);
  }

  async function finishAuthorizationFromUrl() {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");
    const oauthError = url.searchParams.get("error");
    if (!code && !oauthError) return { handled: false };

    const cleanUrl = `${url.origin}${url.pathname}${url.hash}`;
    history.replaceState({}, document.title, cleanUrl);
    if (oauthError) throw new Error("Trakt bağlantı isteği iptal edildi.");

    const expectedState = sessionStorage.getItem(STATE_KEY);
    sessionStorage.removeItem(STATE_KEY);
    if (!expectedState || expectedState !== returnedState) throw new Error("OAuth güvenlik doğrulaması başarısız oldu. Lütfen yeniden deneyin.");
    if (!configured) throw new Error("Trakt OAuth yapılandırması eksik.");

    const tokens = await authRequest("/oauth/token", { code, redirect_uri: redirectUri });
    saveSession(tokens);
    return { handled: true, session: tokens };
  }

  function expiresSoon() {
    if (!session?.created_at || !session?.expires_in) return false;
    return Date.now() >= (session.created_at + session.expires_in - 60) * 1000;
  }

  async function ensureFreshSession() {
    if (!session?.access_token) throw new Error("Trakt hesabı bağlı değil.");
    if (!expiresSoon()) return session;
    if (!session.refresh_token) throw new Error("Trakt oturumu sona erdi. Lütfen yeniden bağlanın.");
    const tokens = await authRequest("/oauth/refresh", {
      refresh_token: session.refresh_token,
      redirect_uri: redirectUri
    });
    saveSession(tokens);
    return tokens;
  }

  async function api(path, options = {}) {
    const activeSession = await ensureFreshSession();
    const response = await fetch(`${TRAKT_API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "trakt-api-version": "2",
        "trakt-api-key": normalizedClientId,
        Authorization: `Bearer ${activeSession.access_token}`,
        ...options.headers
      }
    });
    if (response.status === 204) return null;
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error_description || payload.error || `Trakt API hatası (${response.status})`);
    return payload;
  }

  async function getProfile() {
    return api("/users/settings");
  }

  async function getSyncState() {
    const [historyMovies, historyShows, watchlistMovies, watchlistShows] = await Promise.all([
      api("/sync/history/movies?limit=1000"),
      api("/sync/history/shows?limit=1000"),
      api("/sync/watchlist/movies?limit=1000"),
      api("/sync/watchlist/shows?limit=1000")
    ]);
    const watchedImdb = new Set([
      ...historyMovies.map(entry => entry.movie?.ids?.imdb).filter(Boolean),
      ...historyShows.map(entry => entry.show?.ids?.imdb).filter(Boolean)
    ]);
    const savedImdb = new Set([
      ...watchlistMovies.map(entry => entry.movie?.ids?.imdb).filter(Boolean),
      ...watchlistShows.map(entry => entry.show?.ids?.imdb).filter(Boolean)
    ]);
    return { watchedImdb, savedImdb };
  }

  async function setMovieWatched(item, watched) {
    if (item.type !== "Film" || !item.imdbId) return false;
    await api(watched ? "/sync/history" : "/sync/history/remove", {
      method: "POST",
      body: JSON.stringify({ movies: [{ ids: { imdb: item.imdbId } }] })
    });
    return true;
  }

  async function setWatchlist(item, saved) {
    if (!item.imdbId) return false;
    const key = item.type === "Film" ? "movies" : "shows";
    await api(saved ? "/sync/watchlist" : "/sync/watchlist/remove", {
      method: "POST",
      body: JSON.stringify({ [key]: [{ ids: { imdb: item.imdbId } }] })
    });
    return true;
  }

  return {
    configured,
    isConnected: () => Boolean(session?.access_token),
    beginAuthorization,
    finishAuthorizationFromUrl,
    getProfile,
    getSyncState,
    setMovieWatched,
    setWatchlist,
    disconnect: () => saveSession(null)
  };
}
