import axios from "axios";
import fs from "fs";
import path from "path";

const AUTH_BASE = "https://auth.bullhornstaffing.com";
const REST_BASE = "https://rest-services.bullhornstaffing.com/rest-services";
const REDIRECT_URI = "http://localhost:3001/api/auth/callback";
const TOKEN_FILE = path.join(process.cwd(), ".bullhorn-token.json");

export interface Session {
  BhRestToken: string;
  restUrl: string;
  expiresAt: number;
}

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

let cachedSession: Session | null = null;

function loadStoredTokens(): StoredTokens | null {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      return JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8")) as StoredTokens;
    }
  } catch { /* ignore */ }
  return null;
}

function saveTokens(tokens: StoredTokens) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens), "utf-8");
}

export function getAuthorizeUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.BULLHORN_CLIENT_ID!,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
  });
  return `${AUTH_BASE}/oauth/authorize?${params}`;
}

export async function handleCallback(code: string): Promise<void> {
  const clientId = process.env.BULLHORN_CLIENT_ID!;
  const clientSecret = process.env.BULLHORN_CLIENT_SECRET!;

  const tokenParams = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: REDIRECT_URI,
  });

  const tokenRes = await axios.post(`${AUTH_BASE}/oauth/token?${tokenParams}`);
  saveTokens({
    accessToken: tokenRes.data.access_token,
    refreshToken: tokenRes.data.refresh_token,
  });
  cachedSession = null; // force re-login on next request
}

async function loginWithAccessToken(accessToken: string): Promise<Session> {
  const loginRes = await axios.post(
    `${REST_BASE}/login?version=*&access_token=${accessToken}`
  );
  return {
    BhRestToken: loginRes.data.BhRestToken,
    restUrl: loginRes.data.restUrl,
    expiresAt: Date.now() + 9 * 60 * 1000,
  };
}

async function refreshAccessToken(refreshToken: string): Promise<StoredTokens> {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: process.env.BULLHORN_CLIENT_ID!,
    client_secret: process.env.BULLHORN_CLIENT_SECRET!,
  });
  const res = await axios.post(`${AUTH_BASE}/oauth/token?${params}`);
  const tokens: StoredTokens = {
    accessToken: res.data.access_token,
    refreshToken: res.data.refresh_token ?? refreshToken,
  };
  saveTokens(tokens);
  return tokens;
}

export async function getSession(): Promise<Session> {
  if (cachedSession && Date.now() < cachedSession.expiresAt) {
    return cachedSession;
  }

  const stored = loadStoredTokens();
  if (!stored) {
    throw new Error("SETUP_REQUIRED");
  }

  try {
    cachedSession = await loginWithAccessToken(stored.accessToken);
    return cachedSession;
  } catch {
    // Access token expired — try refresh
    try {
      const refreshed = await refreshAccessToken(stored.refreshToken);
      cachedSession = await loginWithAccessToken(refreshed.accessToken);
      return cachedSession;
    } catch {
      // Refresh also failed — need to re-authorize
      fs.unlinkSync(TOKEN_FILE);
      throw new Error("SETUP_REQUIRED");
    }
  }
}

export function invalidateSession() {
  cachedSession = null;
}
