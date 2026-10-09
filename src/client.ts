import {
  APIError,
  ConnectionError,
  createAPIError,
  NusiiError,
  parseRetryAfter,
  TimeoutError,
} from './errors';
import { AccountResource } from './resources/account';
import { ClientsResource } from './resources/clients';
import { IntegrationsResource } from './resources/integrations';
import { LineItemsResource } from './resources/line-items';
import { ProposalActivitiesResource } from './resources/proposal-activities';
import { ProposalsResource } from './resources/proposals';
import {
  CurrenciesResource,
  LocalesResource,
  PdfPageSizesResource,
  ThemesResource,
} from './resources/reference-data';
import { SectionsResource } from './resources/sections';
import { TaxationsResource } from './resources/taxations';
import { TemplatesResource } from './resources/templates';
import { UsersResource } from './resources/users';
import { WebhookEndpointsResource } from './resources/webhook-endpoints';
import { VERSION } from './version';

const DEFAULT_BASE_URL = 'https://app.nusii.com';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 2;
// A Retry-After longer than this is not worth blocking on: the error is thrown instead.
const MAX_RETRY_AFTER_SECONDS = 60;

export interface ClientOptions {
  /**
   * Personal API token from https://app.nusii.com/settings/api.
   * Defaults to the `NUSII_API_KEY` environment variable.
   */
  apiKey?: string | undefined;
  /**
   * OAuth 2.0 access token, as an alternative to `apiKey`.
   * Defaults to the `NUSII_ACCESS_TOKEN` environment variable.
   */
  accessToken?: string | undefined;
  /**
   * Defaults to the `NUSII_BASE_URL` environment variable, then `https://app.nusii.com`.
   */
  baseUrl?: string | undefined;
  /** Milliseconds before a request is aborted. Default: 30 000. */
  timeout?: number | undefined;
  /**
   * How often a failed request is retried. Rate limited requests (429) are
   * always safe to retry; connection errors and 5xx responses are only
   * retried for GET requests. Default: 2.
   */
  maxRetries?: number | undefined;
  /** Headers sent with every request. */
  headers?: Record<string, string> | undefined;
  /** A custom `fetch` implementation, e.g. for proxies or tests. */
  fetch?: typeof fetch | undefined;
}

/** Per request overrides, accepted as the last argument of every method. */
export interface RequestOptions {
  /** Cancels the request. */
  signal?: AbortSignal | undefined;
  timeout?: number | undefined;
  maxRetries?: number | undefined;
  headers?: Record<string, string> | undefined;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly (string | number)[];

export interface RequestConfig {
  method: HttpMethod;
  /** Path below `/api/v2`, e.g. `/clients`. */
  path: string;
  /** Query parameters. Arrays are sent as `key[]=a&key[]=b`, `null`/`undefined` are skipped. */
  query?: Record<string, QueryValue> | undefined;
  /** JSON request body. */
  body?: unknown;
}

/**
 * Client for the Nusii API.
 *
 * @example
 * ```ts
 * import { Nusii } from '@nusii/nusii';
 *
 * const nusii = new Nusii({ apiKey: process.env.NUSII_API_KEY });
 * const proposals = await nusii.proposals.list({ status: 'pending' });
 * ```
 */
export class Nusii {
  readonly baseUrl: string;
  readonly timeout: number;
  readonly maxRetries: number;

  readonly #authorization: string;
  readonly #headers: Record<string, string>;
  readonly #fetch: typeof fetch;

  /** The account the credentials belong to. */
  readonly account: AccountResource = new AccountResource(this);
  readonly clients: ClientsResource = new ClientsResource(this);
  readonly proposals: ProposalsResource = new ProposalsResource(this);
  readonly sections: SectionsResource = new SectionsResource(this);
  readonly lineItems: LineItemsResource = new LineItemsResource(this);
  /** Taxes and discounts applied to a proposal's total. */
  readonly taxations: TaxationsResource = new TaxationsResource(this);
  readonly templates: TemplatesResource = new TemplatesResource(this);
  readonly proposalActivities: ProposalActivitiesResource = new ProposalActivitiesResource(this);
  /** Team members of the account. */
  readonly users: UsersResource = new UsersResource(this);
  readonly webhookEndpoints: WebhookEndpointsResource = new WebhookEndpointsResource(this);
  readonly themes: ThemesResource = new ThemesResource(this);
  readonly currencies: CurrenciesResource = new CurrenciesResource(this);
  readonly locales: LocalesResource = new LocalesResource(this);
  readonly pdfPageSizes: PdfPageSizesResource = new PdfPageSizesResource(this);
  /** CRM integration installations. */
  readonly integrations: IntegrationsResource = new IntegrationsResource(this);

  constructor(options: ClientOptions = {}) {
    this.#authorization = resolveAuthorization(options);
    this.baseUrl = normalizeBaseUrl(
      options.baseUrl ?? readEnv('NUSII_BASE_URL') ?? DEFAULT_BASE_URL,
    );
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.#headers = { ...options.headers };

    const customFetch = options.fetch;
    // Late bound so the global is looked up per call and invoked with the right `this`.
    this.#fetch = customFetch ?? ((input, init) => globalThis.fetch(input, init));
  }

  /**
   * Sends a request to any API v2 endpoint and returns the parsed JSON body
   * as is (JSON:API documents are not flattened). Useful for endpoints this
   * library does not wrap yet.
   */
  async request<T = unknown>(config: RequestConfig, options: RequestOptions = {}): Promise<T> {
    const url = `${this.baseUrl}/api/v2${config.path}${buildQueryString(config.query)}`;
    const maxRetries = options.maxRetries ?? this.maxRetries;
    const timeout = options.timeout ?? this.timeout;
    const headers = new Headers({
      Accept: 'application/json',
      // Always sent, also on GET: without it Nusii answers an invalid key with
      // a redirect to the login page instead of a 401.
      'Content-Type': 'application/json',
      'User-Agent': `nusii-typescript/${VERSION}`,
    });
    // Headers are case insensitive: `set` replaces a default whatever its casing.
    for (const [name, value] of Object.entries({ ...this.#headers, ...options.headers })) {
      headers.set(name, value);
    }
    headers.set('Authorization', this.#authorization);

    const init: RequestInit = { method: config.method, headers };
    if (config.body !== undefined) init.body = JSON.stringify(config.body);

    for (let attempt = 0; ; attempt++) {
      let response: Response;
      let text: string;
      try {
        response = await this.#fetchWithTimeout(url, init, timeout, options.signal);
        // Read inside the try: the timeout also covers downloading the body.
        text = await response.text();
      } catch (error) {
        if (options.signal?.aborted) throw error;
        const failure = isTimeout(error)
          ? new TimeoutError(`Request to ${url} timed out after ${timeout}ms`, { cause: error })
          : new ConnectionError(`Could not reach the Nusii API at ${url}: ${messageOf(error)}`, {
              cause: error,
            });
        if (config.method === 'GET' && attempt < maxRetries) {
          await sleep(backoff(attempt), options.signal);
          continue;
        }
        throw failure;
      }

      if (response.ok) return parseSuccessBody<T>(response, text);

      const delay = retryDelay(config.method, response, attempt, maxRetries);
      if (delay !== null) {
        await sleep(delay, options.signal);
        continue;
      }
      throw createAPIError(response.status, response.headers, parseErrorBody(text));
    }
  }

  async #fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeout: number,
    signal: AbortSignal | undefined,
  ): Promise<Response> {
    const timeoutSignal = AbortSignal.timeout(timeout);
    const fetchImpl = this.#fetch;
    return fetchImpl(url, {
      ...init,
      signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal,
    });
  }
}

function resolveAuthorization(options: ClientOptions): string {
  if (options.apiKey) return `Token token=${options.apiKey}`;
  if (options.accessToken) return `Bearer ${options.accessToken}`;

  const apiKey = readEnv('NUSII_API_KEY');
  if (apiKey) return `Token token=${apiKey}`;
  const accessToken = readEnv('NUSII_ACCESS_TOKEN');
  if (accessToken) return `Bearer ${accessToken}`;

  throw new NusiiError(
    'Missing Nusii credentials. Pass `apiKey` or `accessToken` to `new Nusii()`, ' +
      'or set the NUSII_API_KEY environment variable.',
  );
}

function readEnv(name: string): string | undefined {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env;
  const value = env?.[name]?.trim();
  return value ? value : undefined;
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '').replace(/\/api\/v2$/, '');
}

function buildQueryString(query: Record<string, QueryValue> | undefined): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(`${key}[]`, String(item));
    } else {
      params.append(key, String(value));
    }
  }
  const search = params.toString();
  return search ? `?${search}` : '';
}

function retryDelay(
  method: HttpMethod,
  response: Response,
  attempt: number,
  maxRetries: number,
): number | null {
  if (attempt >= maxRetries) return null;

  const { status } = response;
  // A throttled request never reached the application, so it is safe to repeat
  // for every method. Server errors are only retried when repeating is harmless.
  const retryable = status === 429 || (method === 'GET' && [500, 502, 503, 504].includes(status));
  if (!retryable) return null;

  const retryAfter = parseRetryAfter(response.headers.get('retry-after'));
  if (retryAfter === null) return backoff(attempt);
  return retryAfter > MAX_RETRY_AFTER_SECONDS ? null : retryAfter * 1000;
}

// 0.5s, 1s, 2s... capped at 8s, with jitter so parallel clients spread out.
function backoff(attempt: number): number {
  const delay = Math.min(500 * 2 ** attempt, 8000);
  return delay * (1 - Math.random() * 0.25);
}

function sleep(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function parseSuccessBody<T>(response: Response, text: string): T {
  if (text === '') return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    const contentType = response.headers.get('content-type') ?? 'unknown content type';
    throw new APIError(
      response.status,
      `Expected JSON from the Nusii API but received ${contentType}. Check the base URL.`,
      { headers: response.headers, body: text },
    );
  }
}

function parseErrorBody(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && error.name === 'TimeoutError';
}

function messageOf(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const cause = error.cause instanceof Error ? ` (${error.cause.message})` : '';
  return `${error.message}${cause}`;
}
