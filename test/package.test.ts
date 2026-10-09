import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as nusii from '../src';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

describe('package', () => {
  it('reports the version from package.json', () => {
    expect(nusii.VERSION).toBe(pkg.version);
  });

  it('exports the client, errors and helpers', () => {
    expect(Object.keys(nusii).sort()).toEqual(
      [
        'APIError',
        'AuthenticationError',
        'BadRequestError',
        'ConnectionError',
        'ForbiddenError',
        'GoneError',
        'MethodNotAllowedError',
        'NotAcceptableError',
        'NotFoundError',
        'Nusii',
        'NusiiError',
        'PROPOSAL_STATUSES',
        'Page',
        'PaymentRequiredError',
        'RateLimitError',
        'ServerError',
        'ServiceUnavailableError',
        'TimeoutError',
        'UnprocessableEntityError',
        'VERSION',
        'WEBHOOK_EVENTS',
        'parseWebhookEvent',
      ].sort(),
    );
  });
});
