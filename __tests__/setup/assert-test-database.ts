const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function assertTestDatabaseUrl(url: string | undefined): string {
  if (!url) throw new Error('TEST_DATABASE_URL ausente no .env.test');

  const parsed = new URL(url);
  const database = parsed.pathname.replace(/^\//, '');
  const isLocal = LOCAL_HOSTS.has(parsed.hostname);
  const isTestDatabase = database.endsWith('_test');

  if (!isLocal && !isTestDatabase) {
    throw new Error(
      `Banco de testes recusado (${parsed.hostname}/${database}): ` +
        'reset só roda em localhost ou em banco com nome terminado em "_test"'
    );
  }

  return url;
}
