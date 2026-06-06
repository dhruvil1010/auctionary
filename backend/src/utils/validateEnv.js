// Fail-closed startup check. The app refuses to boot if critical environment
// variables are missing, or if the JWT secrets are too short or a known default.
// This is what stops Risk #1 from ever coming back: even if someone redeploys with
// the old "change_me" placeholder secrets, the server won't start.

const REQUIRED = [
  "MONGODB_URI",
  "ACCESS_TOKEN_SECRET",
  "REFRESH_TOKEN_SECRET",
  "CORS_ORIGIN",
];

// Placeholder/example values that must never reach production.
const KNOWN_WEAK = new Set([
  "dev_access_secret_change_me",
  "dev_refresh_secret_change_me",
  "change_me",
  "changeme",
  "secret",
  "password",
]);

const MIN_SECRET_LENGTH = 32;

export function validateEnv() {
  const missing = REQUIRED.filter((k) => !process.env[k] || !process.env[k].trim());
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  for (const key of ["ACCESS_TOKEN_SECRET", "REFRESH_TOKEN_SECRET"]) {
    const value = process.env[key];
    if (value.length < MIN_SECRET_LENGTH || KNOWN_WEAK.has(value)) {
      throw new Error(
        `${key} is weak or a known default. Set a strong random value ` +
          `(>= ${MIN_SECRET_LENGTH} chars), e.g. \`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"\`.`
      );
    }
  }

  // The two secrets must differ, so an access token can never be replayed as a refresh token.
  if (process.env.ACCESS_TOKEN_SECRET === process.env.REFRESH_TOKEN_SECRET) {
    throw new Error("ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must be different.");
  }
}
