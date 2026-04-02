import axios from "axios";

const AUTH_BASE = "https://auth.bullhornstaffing.com";
const REST_BASE = "https://rest-services.bullhornstaffing.com/rest-services";
const REDIRECT_URI = "http://localhost:3000/api/auth/callback";

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

  // Step 1: Get auth code — Bullhorn redirects to redirect_uri?code=XXX
  const authorizeParams = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    username,
    password,
    action: "Login",
    redirect_uri: REDIRECT_URI,
  });

  const authorizeRes = await axios.get(
    `${AUTH_BASE}/oauth/authorize?${authorizeParams}`,
    {
      maxRedirects: 0,
      validateStatus: () => true, // accept any status, we handle it ourselves
    }
  );

  console.log("Bullhorn authorize status:", authorizeRes.status);
  console.log("Bullhorn authorize location:", authorizeRes.headers["location"]);

  const location = authorizeRes.headers["location"] as string | undefined;
  if (!location) {
    throw new Error(
      `Bullhorn authorize mislukt (status ${authorizeRes.status}) — controleer gebruikersnaam/wachtwoord`
    );
  }

  // Extract code from redirect URL
  const redirectUrl = new URL(
    location.startsWith("http") ? location : `http://placeholder${location}`
  );
  const code = redirectUrl.searchParams.get("code");
  if (!code) {
    throw new Error(`Geen code in Bullhorn redirect: ${location}`);
  }

  // Step 2: Exchange code for access token
  const tokenParams = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: REDIRECT_URI,
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
    expiresAt: Date.now() + 9 * 60 * 1000,
  };

  return cachedSession;
}

export function invalidateSession() {
  cachedSession = null;
}
