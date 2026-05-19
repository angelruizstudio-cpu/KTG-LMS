export function env(name: string, fallback = "") {
  return process.env[name] ?? fallback;
}

export function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
