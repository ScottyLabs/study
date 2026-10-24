## Google Calendar

Calendar uses server-side OAuth authorization-code flow through the same
Ricochet callback relay as Keycloak. Google sends a code to `OAUTH_RELAY_URL`;
Ricochet forwards it to the originating app's `/api/calendar/oauth/callback`.
The app exchanges the code using the relay URL as its redirect URI. Google
credentials are encrypted in PostgreSQL and never returned to the browser.

### Why we switched from the browser token flow

The original integration used Google Identity Services' `initTokenClient` to
obtain an access token in the browser and call Calendar from the frontend. It
worked on the registered production origin, but each new PR preview
(`study-web-pr-<number>.scottylabs.net`) needed its own authorized JavaScript
origin in Google Console. Google does not allow wildcard origins, so production
working did not mean an arbitrary new preview would work.

Authorization-code flow through Ricochet removes that per-preview configuration.
Google redirects to one registered relay URL for deployed environments. Ricochet
forwards the code and state to the app that started authorization; that app
validates the session-bound, single-use state and exchanges the code with Google.
Ricochet is a callback relay, not the component that stores or refreshes tokens.
Switching to code flow alone would not solve the preview problem if every preview
still used its own Google-registered redirect URI.

The browser token model also provides no refresh token. Once its short-lived
access token expired, the browser had to request another token. The new backend
requests offline access and stores encrypted refresh credentials, allowing later
group actions to refresh access tokens without opening another authorization
popup while the connection remains valid. Calendar credentials no longer live
in browser storage or frontend API calls. See Google's
[token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model)
and [server authorization-code flow](https://developers.google.com/identity/protocols/oauth2/web-server).

Future changes must preserve these properties:

- New PR previews must work without adding their origins or callback URLs to
  Google Console. Keep the shared relay and its host allowlist.
- Exchange codes, store encrypted tokens, refresh credentials, and call Calendar
  on the server. Do not restore `initTokenClient` or browser token storage.
- Keep PKCE and session-bound, expiring, single-use state validation. A return
  URL in state is not sufficient authorization or CSRF protection by itself.
- Keep connections isolated by user and application origin. Reuse a valid
  connection for later actions; request consent again only when connecting or
  reconnecting, not for every group.

### Configuration and rollout

Before implementation or rollout, confirm that the deployed client belongs to
the intended Google Cloud project. The reported production setup is **External,
In Production**, with both current Calendar scopes approved; verify these exact
scopes on Google Auth Platform's Data Access and verification pages:

- `https://www.googleapis.com/auth/calendar.events.owned`
- `https://www.googleapis.com/auth/calendar.freebusy`

Publishing alone does not approve sensitive scopes. Unapproved scopes can show
an unverified-app warning and impose a lifetime user cap. External projects in
Testing allow up to 100 listed test users and expire Calendar authorizations,
including refresh tokens, after seven days. Use that mode only for limited
pilots. Internal projects restrict Google accounts to the owning organization
and do not support the current user-selected-account audience. See
[Google's audience rules](https://support.google.com/cloud/answer/15549945?hl=en).

Setup:

1. Enable the Google Calendar API. Use a **Web application** OAuth client and
   register the exact `OAUTH_RELAY_URL` as an authorized redirect URI. Do not
   register individual PR preview origins for this server-initiated flow.
1. Ensure Ricochet allows the production and preview hosts. Local development
   uses its loopback configuration and a Google-registered local relay URL.
1. Keep the existing `NEXT_PUBLIC_CALENDAR_CLIENT_ID`; the server reuses it.
   `CALENDAR_CLIENT_ID` is an optional override if a separate server client is
   needed. Set `CALENDAR_CLIENT_SECRET` for that same OAuth client and
   `CALENDAR_TOKEN_ENCRYPTION_KEY` through secretspec/OpenBao for each environment.
   The encryption key is 32 random bytes encoded as 64 hexadecimal characters;
   generate it with `openssl rand -hex 32`. Keep it stable across redeployments.
   Changing it requires users to reconnect. All three settings must be provided
   for Calendar to be enabled. The existing public client ID alone leaves
   Calendar disabled without disabling study groups. `NEXT_PUBLIC_CALENDAR_API_KEY`
   is not needed by the server flow and cannot replace the OAuth client secret.
1. Apply the additive Prisma migration before starting the new application.
   Existing Calendar event IDs are retained.

Existing users connect again to establish server credentials. Later requests
refresh access tokens automatically while Google's refresh credentials remain
valid. Expiration or revocation requires reconnection; this is not a permanent
authorization guarantee. Each preview has its own connection, isolated by
StudyStarter user and application origin. Repeated connections across many PRs
can also reach [Google's refresh-token issuance limits](https://developers.google.com/identity/protocols/oauth2#expiration).

Authorization opens a popup without navigating the current form. The page polls
its session-bound attempt, so Google's opener isolation does not prevent
completion. Denial, failure, and a five-minute timeout settle the request. If
the browser severs the popup reference, manually closing it may be detected
only by the timeout. Calendar failures retain the existing group-action behavior.

Run `npm run test:calendar`, `npx tsc --noEmit`, and `npm run lint`. Before broad
rollout, manually connect and create, edit, and delete events on two PR previews
using the same registered relay URL, then check production and local settings.
Do not log callback query strings, authorization codes, or decrypted tokens in
application or reverse-proxy access logs.

The PostgreSQL integration test also runs when `CALENDAR_TEST_DATABASE_URL`
points to a dedicated, migrated test database. It creates and removes its own
test user; do not point this setting at production.
