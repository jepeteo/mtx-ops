process.env.AUTH_JWT_SECRET ??= "test_secret_key_at_least_twenty_chars";
process.env.AUTH_COOKIE_NAME ??= "mtxos_session";
process.env.AUTH_SESSION_DAYS ??= "14";
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test?sslmode=require";
process.env.APP_URL ??= "http://localhost:3000";
process.env.NODE_ENV ??= "test";
