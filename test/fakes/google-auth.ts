import { expect, vi } from "vitest";
import type * as GoogleAuth from "google-auth-library";
import type {
  Credentials,
  GenerateAuthUrlOpts,
  GetTokenOptions,
  OAuth2ClientOptions,
} from "google-auth-library";

const actual = await vi.importActual<typeof GoogleAuth>("google-auth-library");

export const googleAuth = {
  redirectUri: "",
  tokens: {} as Credentials,
  scopes: [] as string[],
  googleAccountId: "google-user-1",
  exchangeError: undefined as Error | undefined,
  refreshError: undefined as Error | undefined,
  exchanges: 0,
  refreshes: 0,
};

// Keep the real PKCE and URL generation while faking Google's token endpoints
class OAuth2Client {
  credentials: Credentials = {};
  readonly #client: GoogleAuth.OAuth2Client;

  constructor(options: OAuth2ClientOptions) {
    this.#client = new actual.OAuth2Client(options);
  }

  generateCodeVerifierAsync() {
    return this.#client.generateCodeVerifierAsync();
  }

  generateAuthUrl(options: GenerateAuthUrlOpts) {
    return this.#client.generateAuthUrl(options);
  }

  setCredentials(credentials: Credentials) {
    this.credentials = credentials;
  }

  getToken(options: GetTokenOptions) {
    googleAuth.exchanges++;
    expect(options.redirect_uri).toBe(googleAuth.redirectUri);
    expect(options.codeVerifier).toBeTruthy();
    if (googleAuth.exchangeError) return Promise.reject(googleAuth.exchangeError);
    return Promise.resolve({ tokens: googleAuth.tokens });
  }

  getTokenInfo() {
    return Promise.resolve({ scopes: googleAuth.scopes, sub: googleAuth.googleAccountId });
  }

  refreshAccessToken() {
    googleAuth.refreshes++;
    if (googleAuth.refreshError) return Promise.reject(googleAuth.refreshError);
    this.credentials = {
      ...this.credentials,
      access_token: "refreshed-access",
      expiry_date: Date.now() + 3600_000,
    };
    return Promise.resolve({ credentials: this.credentials });
  }
}

export const googleAuthModule = { ...actual, OAuth2Client };
