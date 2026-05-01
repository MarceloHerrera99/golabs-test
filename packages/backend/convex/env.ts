declare const process: {
  env: Record<string, string | undefined>;
};

export function getEnv(name: string) {
  return process.env[name];
}
