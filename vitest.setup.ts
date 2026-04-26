/** GitHub Actions exposes missing secrets as ""; `??=` only covers nullish. */
function defaultIfBlank(name: string, value: string) {
  const current = process.env[name];
  if (current === undefined || current === null || current === "") {
    process.env[name] = value;
  }
}

function unsetIfBlank(name: string) {
  const current = process.env[name];
  if (current === undefined || current === "") {
    delete process.env[name];
  }
}

defaultIfBlank("AUTH_JWT_SECRET", "test_secret_key_at_least_twenty_chars");
defaultIfBlank("AUTH_COOKIE_NAME", "mtxos_session");
defaultIfBlank("AUTH_SESSION_DAYS", "14");
defaultIfBlank("DATABASE_URL", "postgresql://test:test@localhost:5432/test?sslmode=require");
defaultIfBlank("APP_URL", "http://localhost:3000");
defaultIfBlank("NODE_ENV", "test");

unsetIfBlank("SEED_OWNER_EMAIL");
unsetIfBlank("SEED_OWNER_PASSWORD");
