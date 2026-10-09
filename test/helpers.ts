import { vi } from 'vitest';
import { type ClientOptions, Nusii } from '../src';

export interface RecordedRequest {
  method: string;
  url: URL;
  headers: Headers;
  body: unknown;
  signal: AbortSignal | null | undefined;
}

type MockResponse = Response | Error | ((request: RecordedRequest) => Response | Promise<Response>);

/** A Nusii client whose `fetch` answers with the given responses, in order. */
export function createClient(responses: MockResponse[] = [], options: ClientOptions = {}) {
  const queue = [...responses];
  const requests: RecordedRequest[] = [];

  const fetch = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const request: RecordedRequest = {
      method: init.method ?? 'GET',
      url: new URL(String(input)),
      headers: new Headers(init.headers),
      body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
      signal: init.signal,
    };
    requests.push(request);

    const next = queue.shift();
    if (next === undefined) throw new Error(`Unexpected request: ${request.method} ${request.url}`);
    if (next instanceof Error) throw next;
    return typeof next === 'function' ? next(request) : next;
  });

  const nusii = new Nusii({ apiKey: 'test-key', fetch, ...options });
  return { nusii, requests, fetch };
}

export function json(
  body: unknown,
  { status = 200, headers = {} }: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/vnd.api+json', ...headers },
  });
}

/** A JSON:API resource object. */
export function resource(
  type: string,
  id: number,
  attributes: Record<string, unknown> = {},
  relationships?: Record<string, { data: { id: string; type: string }[] }>,
) {
  return { id: String(id), type, attributes, ...(relationships ? { relationships } : {}) };
}

export function meta(overrides: Record<string, number | null> = {}) {
  return {
    current_page: 1,
    next_page: null,
    prev_page: null,
    total_pages: 1,
    total_count: 1,
    ...overrides,
  };
}
