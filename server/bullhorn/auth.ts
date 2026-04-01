import axios from "axios";

const AUTH_BASE = "https://auth.bullhornstaffing.com";
const REST_BASE = "https://rest-services.bullhornstaffing.com/rest-services";

export interface Session {
  BhRestToken: string;
  restUrl: string;
  expiresAt: number;
}

let cachedSession: Session | null = null;

export async function getSession(): Promise<Session> {
  if (cachedSession && Date.now() < cachedSession.expiresAt) {
    return cachedSession;
  }

  const clientId = process.env.BULLHORN_CLIENT_ID!;
  const clientSecret = process.env.BULLHORN_CLIENT_SECRET!;
  const username = process.env.BULLHORN_USERNAME!;
  const password = process.env.BULLHORN_PASSWORD!;

  // Step 1: Get auth code via username/password authorize
  const authorizeParams = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    username,
    password,
    action: "Login",
  });

  let code: string;
  try {
    await axios.get(`${AUTH_BASE}/oauth/authorize?${authorizeParams}`, {
      maxRedirects: 0,
    });
    throw new Error("Expected 302 redirect from Bullhorn authorize");
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status: number; headers: Record<string, string> } };
    if (axiosErr.response?.status === 302) {
      const location = axiosErr.response.headers["location"];
      const url = new URL(location);
      const c = url.searchParams.get("code");
      if (!c) throw new Error("No code in Bullhorn redirect");
      code = c;
    } else {
      throw err;
    }
  }

  // Step 2: Exchange code for access token
  const tokenParams = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const tokenRes = await axios.post(
    `${AUTH_BASE}/oauth/token?${tokenParams}`
  );
  const accessToken: string = tokenRes.data.access_token;

  // Step 3: Login to get BhRestToken + restUrl
  const loginRes = await axios.post(
    `${REST_BASE}/login?version=*&access_token=${accessToken}`
  );

  cachedSession = {
    BhRestToken: loginRes.data.BhRestToken,
    restUrl: loginRes.data.restUrl,
    expiresAt: Date.now() + 9 * 60 * 1000, // refresh after 9 min
  };

  return cachedSession;
}

export function invalidateSession() {
  cachedSession = null;
}
