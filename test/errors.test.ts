import { describe, expect, it } from 'vitest';
import {
  APIError,
  AuthenticationError,
  BadRequestError,
  ForbiddenError,
  GoneError,
  MethodNotAllowedError,
  NotAcceptableError,
  NotFoundError,
  NusiiError,
  PaymentRequiredError,
  RateLimitError,
  ServerError,
  ServiceUnavailableError,
  UnprocessableEntityError,
} from '../src';
import { createClient, json } from './helpers';

async function errorFor(status: number, body: unknown = {}, headers: Record<string, string> = {}) {
  const response =
    typeof body === 'string'
      ? new Response(body, { status, headers })
      : json(body, { status, headers });
  const { nusii } = createClient([response], { maxRetries: 0 });
  return nusii.clients.get(1).then(
    () => expect.unreachable('the request should have failed'),
    (error: unknown) => error as APIError,
  );
}

describe('error classes', () => {
  it.each([
    [400, BadRequestError],
    [401, AuthenticationError],
    [402, PaymentRequiredError],
    [403, ForbiddenError],
    [404, NotFoundError],
    [405, MethodNotAllowedError],
    [406, NotAcceptableError],
    [410, GoneError],
    [422, UnprocessableEntityError],
    [429, RateLimitError],
    [500, ServerError],
    [502, ServerError],
    [503, ServiceUnavailableError],
  ])('maps %i to %o', async (status, ErrorClass) => {
    const error = await errorFor(status);
    expect(error).toBeInstanceOf(ErrorClass);
    expect(error).toBeInstanceOf(APIError);
    expect(error).toBeInstanceOf(NusiiError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe(ErrorClass.name);
    expect(error.status).toBe(status);
  });

  it('uses APIError for other client errors', async () => {
    const error = await errorFor(418);
    expect(error.constructor).toBe(APIError);
  });

  it('treats a 503 as a server error', async () => {
    expect(await errorFor(503)).toBeInstanceOf(ServerError);
  });
});

describe('error details', () => {
  it('formats JSON:API validation errors', async () => {
    const errors = [
      { source: { pointer: '/data/attributes/name' }, detail: "can't be blank" },
      { source: { pointer: '/data/attributes/email' }, detail: 'is invalid' },
      { source: { pointer: '/data' }, detail: 'Access Denied' },
    ];
    const error = await errorFor(422, { errors });

    expect(error.message).toBe("422 name can't be blank; email is invalid; Access Denied");
    expect(error.errors).toEqual(errors);
    expect(error.body).toEqual({ errors });
  });

  it('exposes the error code and message', async () => {
    const error = await errorFor(422, {
      error: 'proposal_locked',
      message: 'This proposal is locked for editing',
    });
    expect(error.code).toBe('proposal_locked');
    expect(error.message).toBe('422 This proposal is locked for editing');
  });

  it('recognizes a bare error code', async () => {
    const error = await errorFor(403, { error: 'insufficient_scope' });
    expect(error.code).toBe('insufficient_scope');
    expect(error.message).toBe('403 insufficient_scope');
  });

  it('uses a plain error sentence as the message', async () => {
    const error = await errorFor(400, { error: 'Invalid request body' });
    expect(error.code).toBeUndefined();
    expect(error.message).toBe('400 Invalid request body');
  });

  it('reads a nested error object', async () => {
    const error = await errorFor(429, {
      error: { status: 429, name: 'Too Many Requests', message: 'Retry later.' },
    });
    expect(error.message).toBe('429 Retry later.');
  });

  it('reads a top level message', async () => {
    const error = await errorFor(403, { message: 'Authentication required or invalid' });
    expect(error.message).toBe('403 Authentication required or invalid');
  });

  it('keeps a non-JSON body as text', async () => {
    const error = await errorFor(502, 'Bad Gateway');
    expect(error.body).toBe('Bad Gateway');
    expect(error.message).toBe('502 Bad Gateway');
  });

  it('falls back to a generic message', async () => {
    const error = await errorFor(401, '');
    expect(error.message).toBe('401 Request failed');
  });

  it('exposes the response headers', async () => {
    const error = await errorFor(404, {}, { 'X-Request-Id': 'req-1' });
    expect(error.headers.get('x-request-id')).toBe('req-1');
  });

  it('parses Retry-After as an HTTP date', async () => {
    const date = new Date(Date.now() + 30_000).toUTCString();
    const error = (await errorFor(429, {}, { 'Retry-After': date })) as RateLimitError;
    expect(error.retryAfter).toBeGreaterThanOrEqual(28);
    expect(error.retryAfter).toBeLessThanOrEqual(30);
  });

  it('has no retryAfter without the header', async () => {
    const error = (await errorFor(429)) as RateLimitError;
    expect(error.retryAfter).toBeNull();
  });
});
