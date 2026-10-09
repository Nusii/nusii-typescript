import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  APIError,
  ConnectionError,
  Nusii,
  NusiiError,
  RateLimitError,
  ServerError,
  ServiceUnavailableError,
  TimeoutError,
  VERSION,
} from '../src';
import { createClient, json, resource } from './helpers';

const account = { data: resource('accounts', 1, { name: 'Acme' }) };

describe('authentication', () => {
  it('sends the API key as a token', async () => {
    const { nusii, requests } = createClient([json(account)], { apiKey: 'secret' });
    await nusii.account.me();
    expect(requests[0]?.headers.get('authorization')).toBe('Token token=secret');
  });

  it('sends an OAuth access token as a bearer token', async () => {
    const { nusii, requests } = createClient([json(account)], {
      apiKey: undefined,
      accessToken: 'oauth-token',
    });
    await nusii.account.me();
    expect(requests[0]?.headers.get('authorization')).toBe('Bearer oauth-token');
  });

  it('reads the API key from NUSII_API_KEY', async () => {
    vi.stubEnv('NUSII_API_KEY', 'from-env');
    const { nusii, requests } = createClient([json(account)], { apiKey: undefined });
    await nusii.account.me();
    expect(requests[0]?.headers.get('authorization')).toBe('Token token=from-env');
  });

  it('reads an access token from NUSII_ACCESS_TOKEN', async () => {
    vi.stubEnv('NUSII_ACCESS_TOKEN', 'env-token');
    const { nusii, requests } = createClient([json(account)], { apiKey: undefined });
    await nusii.account.me();
    expect(requests[0]?.headers.get('authorization')).toBe('Bearer env-token');
  });

  it('throws without credentials', () => {
    expect(() => new Nusii()).toThrow(NusiiError);
    expect(() => new Nusii()).toThrow(/NUSII_API_KEY/);
  });
});

describe('requests', () => {
  it('sends JSON headers and a user agent to the v2 API', async () => {
    const { nusii, requests } = createClient([json(account)]);
    await nusii.account.me();

    const request = requests[0];
    expect(request?.url.href).toBe('https://app.nusii.com/api/v2/account/me');
    expect(request?.headers.get('accept')).toBe('application/json');
    // Required on GET too, or Nusii redirects an invalid key to the login page.
    expect(request?.headers.get('content-type')).toBe('application/json');
    expect(request?.headers.get('user-agent')).toBe(`nusii-typescript/${VERSION}`);
  });

  it.each([
    'http://localhost:3000',
    'http://localhost:3000/',
    'http://localhost:3000/api/v2',
    'http://localhost:3000/api/v2/',
  ])('normalizes the base URL %s', async (baseUrl) => {
    const { nusii, requests } = createClient([json(account)], { baseUrl });
    await nusii.account.me();
    expect(requests[0]?.url.href).toBe('http://localhost:3000/api/v2/account/me');
  });

  it('reads the base URL from NUSII_BASE_URL', async () => {
    vi.stubEnv('NUSII_BASE_URL', 'https://staging.example.com');
    const { nusii, requests } = createClient([json(account)]);
    await nusii.account.me();
    expect(requests[0]?.url.origin).toBe('https://staging.example.com');
  });

  it('merges custom headers but never lets them replace the credentials', async () => {
    const { nusii, requests } = createClient([json(account), json(account)], {
      headers: { 'X-Team': 'sales', Authorization: 'nope' },
    });
    await nusii.account.me();
    await nusii.account.me({ headers: { 'X-Request-Id': 'abc' } });

    expect(requests[0]?.headers.get('x-team')).toBe('sales');
    expect(requests[0]?.headers.get('authorization')).toBe('Token token=test-key');
    expect(requests[1]?.headers.get('x-request-id')).toBe('abc');
  });

  it('replaces default headers whatever the casing of the custom one', async () => {
    const { nusii, requests } = createClient([json(account)], {
      headers: { authorization: 'nope', accept: 'application/vnd.api+json' },
    });
    await nusii.account.me();

    expect(requests[0]?.headers.get('authorization')).toBe('Token token=test-key');
    expect(requests[0]?.headers.get('accept')).toBe('application/vnd.api+json');
  });

  it('serializes query parameters', async () => {
    const { nusii, requests } = createClient([json([])]);
    await nusii.request({
      method: 'GET',
      path: '/proposals',
      query: {
        status: 'draft',
        archived: false,
        page: 2,
        skip: undefined,
        none: null,
        ids: [1, 2],
      },
    });
    const params = requests[0]?.url.searchParams;
    expect(params?.get('status')).toBe('draft');
    expect(params?.get('archived')).toBe('false');
    expect(params?.get('page')).toBe('2');
    expect(params?.has('skip')).toBe(false);
    expect(params?.has('none')).toBe(false);
    expect(params?.getAll('ids[]')).toEqual(['1', '2']);
  });

  it('returns the raw JSON body from request()', async () => {
    const { nusii } = createClient([json({ data: [], meta: { total_count: 0 } })]);
    await expect(nusii.request({ method: 'GET', path: '/clients' })).resolves.toEqual({
      data: [],
      meta: { total_count: 0 },
    });
  });

  it('returns undefined for an empty body', async () => {
    const { nusii } = createClient([new Response(null, { status: 204 })]);
    await expect(nusii.request({ method: 'DELETE', path: '/x' })).resolves.toBeUndefined();
  });

  it('rejects a non-JSON success response, e.g. a login page', async () => {
    const { nusii } = createClient([
      new Response('<html>Log in</html>', { headers: { 'Content-Type': 'text/html' } }),
    ]);
    const error = await nusii.account.me().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(APIError);
    expect((error as APIError).message).toMatch(/text\/html/);
  });
});

describe('retries', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries a rate limited request after Retry-After', async () => {
    const { nusii, requests } = createClient([
      json(
        { error: { message: 'Throttle limit reached' } },
        {
          status: 429,
          headers: { 'Retry-After': '0' },
        },
      ),
      json(account),
    ]);
    await expect(nusii.account.me()).resolves.toMatchObject({ name: 'Acme' });
    expect(requests).toHaveLength(2);
  });

  it('retries rate limited writes too: they never reached the application', async () => {
    const { nusii, requests } = createClient([
      json({}, { status: 429, headers: { 'Retry-After': '0' } }),
      json({ data: resource('clients', 1, { name: 'Jane' }) }, { status: 201 }),
    ]);
    await nusii.clients.create({ name: 'Jane', email: 'jane@example.com' });
    expect(requests).toHaveLength(2);
  });

  it('throws a RateLimitError once retries are exhausted', async () => {
    const throttled = () =>
      json(
        { error: { status: 429, name: 'Too Many Requests', message: 'Throttle limit reached.' } },
        { status: 429, headers: { 'Retry-After': '0' } },
      );
    const { nusii, requests } = createClient([throttled(), throttled(), throttled()]);

    const error = await nusii.account.me().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RateLimitError);
    expect((error as RateLimitError).retryAfter).toBe(0);
    expect((error as RateLimitError).message).toBe('429 Throttle limit reached.');
    expect(requests).toHaveLength(3);
  });

  it('does not wait for a Retry-After longer than a minute', async () => {
    const { nusii, requests } = createClient([
      json({}, { status: 429, headers: { 'Retry-After': '120' } }),
    ]);
    const error = await nusii.account.me().catch((e: unknown) => e);
    expect((error as RateLimitError).retryAfter).toBe(120);
    expect(requests).toHaveLength(1);
  });

  it('retries server errors on GET with backoff', async () => {
    vi.useFakeTimers();
    const { nusii, requests } = createClient([
      json({}, { status: 503 }),
      json({}, { status: 502 }),
      json(account),
    ]);
    const result = nusii.account.me();
    await vi.runAllTimersAsync();
    await expect(result).resolves.toMatchObject({ name: 'Acme' });
    expect(requests).toHaveLength(3);
  });

  it('does not retry server errors on writes', async () => {
    const { nusii, requests } = createClient([json({}, { status: 500 })]);
    await expect(nusii.clients.create({ name: 'A', email: 'a@b.c' })).rejects.toBeInstanceOf(
      ServerError,
    );
    expect(requests).toHaveLength(1);
  });

  it('honours maxRetries per request', async () => {
    const { nusii, requests } = createClient([json({}, { status: 503 })]);
    await expect(nusii.account.me({ maxRetries: 0 })).rejects.toBeInstanceOf(
      ServiceUnavailableError,
    );
    expect(requests).toHaveLength(1);
  });

  it('retries connection errors on GET, then throws a ConnectionError', async () => {
    vi.useFakeTimers();
    const failure = new TypeError('fetch failed', { cause: new Error('ECONNREFUSED') });
    const { nusii, requests } = createClient([failure, failure, failure]);

    const result = nusii.account.me().catch((e: unknown) => e);
    await vi.runAllTimersAsync();
    const error = await result;

    expect(error).toBeInstanceOf(ConnectionError);
    expect((error as Error).message).toMatch(/ECONNREFUSED/);
    expect((error as Error).cause).toBe(failure);
    expect(requests).toHaveLength(3);
  });

  it('does not retry connection errors on writes', async () => {
    const { nusii, requests } = createClient([new TypeError('fetch failed')]);
    await expect(nusii.proposals.send(1, { email: 'a@b.c' })).rejects.toBeInstanceOf(
      ConnectionError,
    );
    expect(requests).toHaveLength(1);
  });
});

describe('timeouts and cancellation', () => {
  // A fetch that never answers, but rejects like fetch does when its signal aborts.
  const hanging = (request: { signal: AbortSignal | null | undefined }) =>
    new Promise<Response>((_, reject) => {
      request.signal?.addEventListener('abort', () => reject(request.signal?.reason));
    });

  it('throws a TimeoutError when the request takes too long', async () => {
    const { nusii } = createClient([hanging], { timeout: 10, maxRetries: 0 });
    const error = await nusii.account.me().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TimeoutError);
    expect(error).toBeInstanceOf(ConnectionError);
    expect((error as Error).message).toMatch(/timed out after 10ms/);
  });

  it('also times out while the body is still downloading', async () => {
    const stalledBody = (request: { signal: AbortSignal | null | undefined }) =>
      new Response(
        new ReadableStream({
          start(controller) {
            request.signal?.addEventListener('abort', () =>
              controller.error(request.signal?.reason),
            );
          },
        }),
      );
    const { nusii } = createClient([stalledBody], { timeout: 10, maxRetries: 0 });
    await expect(nusii.account.me()).rejects.toBeInstanceOf(TimeoutError);
  });

  it('rejects with the abort reason when the caller aborts, without retrying', async () => {
    const { nusii, requests } = createClient([hanging, hanging]);
    const controller = new AbortController();
    const result = nusii.account.me({ signal: controller.signal });
    controller.abort();

    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    expect(requests).toHaveLength(1);
  });
});
