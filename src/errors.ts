/** A single entry of a JSON:API `errors` array, as returned for validation failures. */
export interface JsonApiError {
  source?: { pointer?: string };
  detail?: string;
  title?: string;
  status?: string;
}

/** Base class for every error thrown by this library. */
export class NusiiError extends Error {
  override name = 'NusiiError';
}

/** The Nusii API answered with an HTTP error status. */
export class APIError extends NusiiError {
  override name = 'APIError';

  /** HTTP status code of the response. */
  readonly status: number;
  /** Response headers. */
  readonly headers: Headers;
  /** Parsed JSON response body, or the raw text when it was not JSON. */
  readonly body: unknown;
  /** Machine readable error code when the API sends one, e.g. `proposal_locked`. */
  readonly code: string | undefined;
  /** Field level validation errors (JSON:API format), when present. */
  readonly errors: JsonApiError[];

  constructor(
    status: number,
    message: string,
    options: {
      headers: Headers;
      body: unknown;
      code?: string | undefined;
      errors?: JsonApiError[];
    },
  ) {
    super(message);
    this.status = status;
    this.headers = options.headers;
    this.body = options.body;
    this.code = options.code;
    this.errors = options.errors ?? [];
  }
}

/** 400: the request was malformed, e.g. a filter given as an object instead of a string. */
export class BadRequestError extends APIError {
  override name = 'BadRequestError';
}

/** 401: the API key or access token is missing or invalid. */
export class AuthenticationError extends APIError {
  override name = 'AuthenticationError';
}

/** 402: the account has reached a plan limit, e.g. its active proposal limit. */
export class PaymentRequiredError extends APIError {
  override name = 'PaymentRequiredError';
}

/** 403: not allowed, e.g. missing OAuth scope, suspended account or unconfirmed sender email. */
export class ForbiddenError extends APIError {
  override name = 'ForbiddenError';
}

/** 404: the resource does not exist or belongs to another account. */
export class NotFoundError extends APIError {
  override name = 'NotFoundError';
}

/** 405: the HTTP method is not supported for this endpoint. */
export class MethodNotAllowedError extends APIError {
  override name = 'MethodNotAllowedError';
}

/** 406: the `Accept` header is not supported. */
export class NotAcceptableError extends APIError {
  override name = 'NotAcceptableError';
}

/** 410: the resource has already been deleted. */
export class GoneError extends APIError {
  override name = 'GoneError';
}

/** 422: validation failed. Inspect `errors` for the individual fields. */
export class UnprocessableEntityError extends APIError {
  override name = 'UnprocessableEntityError';
}

/** 429: too many requests. Nusii allows 100 requests per 30 seconds per token. */
export class RateLimitError extends APIError {
  override name = 'RateLimitError';

  /** Seconds to wait before retrying, from the `Retry-After` header. */
  get retryAfter(): number | null {
    return parseRetryAfter(this.headers.get('retry-after'));
  }
}

/** 5xx: something went wrong on Nusii's side. */
export class ServerError extends APIError {
  override name = 'ServerError';
}

/** 503: the API is temporarily unavailable. */
export class ServiceUnavailableError extends ServerError {
  override name = 'ServiceUnavailableError';
}

/** The request never got a response: DNS failure, refused connection, reset socket... */
export class ConnectionError extends NusiiError {
  override name = 'ConnectionError';
}

/** The request took longer than the configured `timeout`. */
export class TimeoutError extends ConnectionError {
  override name = 'TimeoutError';
}

/** @internal Builds the most specific error subclass for a failed response. */
export function createAPIError(status: number, headers: Headers, body: unknown): APIError {
  const { message, code, errors } = describeErrorBody(body);
  const text = `${status} ${message ?? 'Request failed'}`;
  const options = { headers, body, code, errors };

  switch (status) {
    case 400:
      return new BadRequestError(status, text, options);
    case 401:
      return new AuthenticationError(status, text, options);
    case 402:
      return new PaymentRequiredError(status, text, options);
    case 403:
      return new ForbiddenError(status, text, options);
    case 404:
      return new NotFoundError(status, text, options);
    case 405:
      return new MethodNotAllowedError(status, text, options);
    case 406:
      return new NotAcceptableError(status, text, options);
    case 410:
      return new GoneError(status, text, options);
    case 422:
      return new UnprocessableEntityError(status, text, options);
    case 429:
      return new RateLimitError(status, text, options);
    case 503:
      return new ServiceUnavailableError(status, text, options);
    default:
      return status >= 500
        ? new ServerError(status, text, options)
        : new APIError(status, text, options);
  }
}

/** @internal */
export function parseRetryAfter(value: string | null): number | null {
  if (value === null || value.trim() === '') return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds);
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

// The API reports errors in several shapes depending on where they originate:
//   { errors: [{ source: { pointer: '/data/attributes/name' }, detail: "can't be blank" }] }
//   { error: 'proposal_locked', message: 'This proposal is locked...' }
//   { error: 'Invalid request body' }
//   { error: { status: 429, name: 'Too Many Requests', message: '...' } }
//   { message: 'Authentication required or invalid' }
function describeErrorBody(body: unknown): {
  message: string | undefined;
  code: string | undefined;
  errors: JsonApiError[];
} {
  if (typeof body === 'string') {
    return { message: body.trim().slice(0, 500) || undefined, code: undefined, errors: [] };
  }
  if (!isRecord(body)) return { message: undefined, code: undefined, errors: [] };

  const errors = Array.isArray(body['errors']) ? (body['errors'] as JsonApiError[]) : [];
  if (errors.length > 0) {
    return { message: errors.map(formatJsonApiError).join('; '), code: undefined, errors };
  }

  const error = body['error'];
  const message = typeof body['message'] === 'string' ? body['message'] : undefined;

  if (typeof error === 'string') {
    return message
      ? { message, code: error, errors }
      : { message: error, code: /^[a-z_]+$/.test(error) ? error : undefined, errors };
  }
  if (isRecord(error) && typeof error['message'] === 'string') {
    return { message: error['message'], code: undefined, errors };
  }
  return { message, code: undefined, errors };
}

function formatJsonApiError(error: JsonApiError): string {
  const detail = error.detail ?? error.title ?? 'is invalid';
  const attribute = error.source?.pointer?.split('/').pop();
  if (!attribute || attribute === 'data' || attribute === 'base') return detail;
  return `${attribute} ${detail}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
