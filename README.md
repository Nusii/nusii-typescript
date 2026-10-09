# Nusii for JavaScript & TypeScript

[![npm version](https://img.shields.io/npm/v/@nusii/nusii.svg)](https://www.npmjs.com/package/@nusii/nusii)
[![CI](https://github.com/Nusii/nusii-typescript/actions/workflows/ci.yml/badge.svg)](https://github.com/Nusii/nusii-typescript/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

The official JavaScript and TypeScript client for the [Nusii](https://nusii.com) proposal software API.

Create clients, build and send proposals, track when they are viewed and accepted, and react to webhooks, all from Node.js, Bun, Deno or any edge runtime.

- **Fully typed**: every request and response has TypeScript types, with autocompletion for statuses, cost types and webhook events.
- **Zero dependencies**: uses the platform's built-in `fetch`.
- **Batteries included**: automatic pagination, retries with backoff, timeouts, cancellation and typed errors.
- **ESM and CommonJS**: works with `import` and `require`.

Full API reference: [developer.nusii.com](https://developer.nusii.com)

## Table of contents

- [Installation](#installation)
- [Getting an API key](#getting-an-api-key)
- [Quick start](#quick-start)
- [Usage](#usage)
  - [Account](#account)
  - [Clients](#clients)
  - [Proposals](#proposals)
  - [Sections](#sections)
  - [Line items](#line-items)
  - [Taxes and discounts](#taxes-and-discounts)
  - [Templates](#templates)
  - [Proposal activities](#proposal-activities)
  - [Users](#users)
  - [Webhooks](#webhooks)
  - [Themes, currencies, locales and PDF page sizes](#themes-currencies-locales-and-pdf-page-sizes)
  - [CRM integrations](#crm-integrations)
- [Pagination](#pagination)
- [Error handling](#error-handling)
- [Retries, timeouts and cancellation](#retries-timeouts-and-cancellation)
- [Configuration](#configuration)
- [OAuth](#oauth)
- [Calling any endpoint](#calling-any-endpoint)
- [TypeScript](#typescript)
- [Requirements](#requirements)
- [Development](#development)
- [License](#license)

## Installation

```bash
npm install @nusii/nusii
```

Or with your package manager of choice:

```bash
pnpm add @nusii/nusii
yarn add @nusii/nusii
bun add @nusii/nusii
```

## Getting an API key

1. Log in to [Nusii](https://app.nusii.com).
2. Go to **Settings → API** ([app.nusii.com/settings/api](https://app.nusii.com/settings/api)).
3. Under **Personal Tokens**, create a token and copy it.

Treat the key like a password: it gives full access to your Nusii account. Keep it out of your code and out of git, and only use it on a server, never in browser code.

The usual way is a `.env` file in your project:

```bash
# .env (add this file to .gitignore)
NUSII_API_KEY=your-api-key
```

Node.js 20+ can load it without extra packages:

```bash
node --env-file=.env index.js
```

## Quick start

```ts
import { Nusii } from '@nusii/nusii';

// Reads NUSII_API_KEY from the environment.
const nusii = new Nusii();

// Or pass the key explicitly:
// const nusii = new Nusii({ apiKey: process.env.NUSII_API_KEY });

const account = await nusii.account.me();
console.log(`Connected to ${account.name}`);

const client = await nusii.clients.create({
  name: 'Jane',
  surname: 'Doe',
  email: 'jane@example.com',
  business: 'Acme Inc',
});

const proposal = await nusii.proposals.create({
  title: 'Website redesign',
  client_id: client.id,
});

await nusii.proposals.send(proposal.id, {
  recipients: [{ name: 'Jane Doe', email: 'jane@example.com' }],
  subject: 'Your proposal for the website redesign',
});
```

Using CommonJS:

```js
const { Nusii } = require('@nusii/nusii');

const nusii = new Nusii({ apiKey: process.env.NUSII_API_KEY });
```

Attribute names match the API exactly (`client_id`, `expires_at`...), so everything in the [API documentation](https://developer.nusii.com) applies one to one. Responses are plain objects with a numeric `id`.

## Usage

Every method returns a promise and accepts an optional last argument with [request options](#retries-timeouts-and-cancellation).

### Account

```ts
const account = await nusii.account.me();

account.name; // "Acme Corp"
account.subdomain; // "acme"
account.currency; // "USD"
```

### Clients

```ts
// List (25 per page by default, newest first)
const page = await nusii.clients.list({ page: 1, per_page: 50 });
page.data; // Client[]
page.meta.total_count; // 132

// Search
await nusii.clients.list({ query: 'acme' });
await nusii.clients.list({ email: 'jane@example.com' });
await nusii.clients.list({ emails: ['jane@example.com', 'john@example.com'] });

// Get, create, update, delete
const client = await nusii.clients.get(123);

const created = await nusii.clients.create({
  name: 'Jane', // required
  email: 'jane@example.com', // required
  surname: 'Doe',
  business: 'Acme Inc',
  telephone: '+1 555 1234',
  address: '123 Main St',
  city: 'New York',
  postcode: '10001',
  state: 'NY',
  country: 'US',
  web: 'https://acme.com',
  currency: 'USD',
  locale: 'en',
});

await nusii.clients.update(123, { business: 'Acme Corporation' });
await nusii.clients.delete(123);
```

### Proposals

```ts
// List with filters
await nusii.proposals.list({ status: 'pending' });
await nusii.proposals.list({ statuses: ['accepted', 'rejected'] });
await nusii.proposals.list({ archived: true }); // only archived ones
await nusii.proposals.list({ query: 'website' }); // title, number, client...
await nusii.proposals.list({ recipient_email: 'jane@example.com' });
await nusii.proposals.list({ no_activity_client_view_proposal: true }); // never viewed
await nusii.proposals.list({
  sent_at_after: '2026-01-01', // dates are YYYY-MM-DD, inclusive
  sent_at_before: '2026-03-31',
});

const proposal = await nusii.proposals.get(456);
proposal.status; // "draft" | "pending" | "accepted" | "rejected" | "clarification"
proposal.pdf_url;

// Create from scratch...
await nusii.proposals.create({
  title: 'Website redesign',
  client_id: 123,
  expires_at: '2026-12-31',
  theme: 'clean',
});

// ...or from a template, copying its sections and line items
await nusii.proposals.create({ title: 'Website redesign', client_id: 123, template_id: 42 });

await nusii.proposals.update(456, { title: 'Website redesign v2' });
await nusii.proposals.archive(456);
await nusii.proposals.delete(456);
```

Send a proposal by email to one or more recipients:

```ts
const result = await nusii.proposals.send(456, {
  recipients: [
    { name: 'Jane Doe', email: 'jane@example.com' },
    { name: 'John Doe', email: 'john@example.com', eligible_to_sign: false },
  ],
  cc: 'manager@example.com',
  bcc: 'archive@example.com',
  subject: 'Your proposal',
  message: '<p>Hi Jane, here is the proposal we discussed.</p>',
  sender_email: 'sales@yourcompany.com', // send as a team member (default: account owner)
});

result.status; // "pending"
result.sent_at;
```

A proposal's status follows what happens to it (sent, accepted, rejected), so it cannot be changed with `update`.

### Sections

Sections are the blocks of a proposal or template: text sections and cost sections (which contain line items).

```ts
// Sections of a proposal or template, with their line items
const { data: sections } = await nusii.sections.list({ proposal_id: 456 });
sections[0]?.line_items; // LineItem[] on cost sections

await nusii.sections.list({ template_id: 42 });

// Without a proposal or template: the reusable sections of your content library
await nusii.sections.list();

const section = await nusii.sections.create({
  proposal_id: 456,
  title: 'Project scope',
  body: '<p>What we will deliver.</p>',
  section_type: 'text', // or 'cost'
  position: 1,
});

// Copy a reusable section (with its line items) into a proposal
await nusii.sections.copy(reusableSectionId, { proposal_id: 456, position: 2 });

await nusii.sections.update(section.id, { title: 'Scope of work' });
await nusii.sections.delete(section.id);
```

### Line items

Line items belong to cost sections. Amounts are in cents.

```ts
const items = await nusii.lineItems.list(sectionId);

// A fixed price
await nusii.lineItems.create(sectionId, {
  name: 'Logo design',
  cost_type: 'fixed',
  amount: 150000, // $1,500.00
});

// Per unit: 10 hours at $75
await nusii.lineItems.create(sectionId, {
  name: 'Development',
  cost_type: 'per',
  per_type: 'hour',
  quantity: 10,
  amount: 7500,
});

// Recurring
await nusii.lineItems.create(sectionId, {
  name: 'Hosting',
  cost_type: 'recurring',
  recurring_type: 'monthly',
  amount: 2500,
});

// A price range: "$5,000 – $8,000" (requires price ranges on your account)
const range = await nusii.lineItems.create(sectionId, {
  name: 'Discovery & UX research',
  cost_type: 'range',
  amount: 500000,
  maximum_amount: 800000,
});
range.maximum_amount_formatted; // "$8,000.00"

// Let the client pick optional items
await nusii.lineItems.create(sectionId, { name: 'Extra revision', choice_type: 'checkbox' });

await nusii.lineItems.get(itemId);
await nusii.lineItems.update(itemId, { quantity: 12 });
await nusii.lineItems.delete(itemId);
```

### Taxes and discounts

```ts
await nusii.taxations.create(proposalId, { name: 'VAT', percentage: 21 });
await nusii.taxations.create(proposalId, { name: 'Loyalty discount', percentage: -10 });

const taxes = await nusii.taxations.list(proposalId);
await nusii.taxations.update(proposalId, taxId, { percentage: 19 });
await nusii.taxations.delete(proposalId, taxId);
```

### Templates

```ts
const { data: templates } = await nusii.templates.list();
const template = await nusii.templates.get(42);

// Nusii's public template gallery
await nusii.templates.list({ public_templates: true });
```

### Proposal activities

Every view, send, acceptance, email open and bounce, newest first.

```ts
await nusii.proposalActivities.list();
await nusii.proposalActivities.list({ proposal_id: 456 });
await nusii.proposalActivities.list({ client_id: 123 });

const activity = await nusii.proposalActivities.get(789);
activity.activity_type; // "client_view_proposal", "client_accepted_proposal"...
```

### Users

The team members of your account.

```ts
const { data: users } = await nusii.users.list();
```

### Webhooks

Ask Nusii to POST events to your server:

```ts
const endpoint = await nusii.webhookEndpoints.create({
  target_url: 'https://example.com/webhooks/nusii/a-long-random-secret',
  events: ['proposal_accepted', 'proposal_rejected', 'proposal_activity_client_viewed_proposal'],
});

await nusii.webhookEndpoints.list();
await nusii.webhookEndpoints.get(endpoint.id);
await nusii.webhookEndpoints.delete(endpoint.id);
```

Then receive them. `parseWebhookEvent` gives you a typed event you can narrow by `event_name`:

```ts
import { parseWebhookEvent } from '@nusii/nusii';

// Next.js route handler, Hono, Cloudflare Workers, Bun.serve...
export async function POST(request: Request) {
  const event = parseWebhookEvent(await request.text());

  switch (event.event_name) {
    case 'proposal_accepted':
      console.log(`${event.proposal.title} accepted for ${event.proposal.accepted_total_formatted}`);
      break;
    case 'proposal_activity_client_viewed_proposal':
      console.log(`${event.proposal_activity.client_email} is reading your proposal`);
      break;
    case 'client_created':
      console.log(`New client: ${event.client.email}`);
      break;
  }

  return new Response(null, { status: 204 });
}
```

With Express:

```ts
app.post('/webhooks/nusii/:secret', express.json(), (req, res) => {
  const event = parseWebhookEvent(req.body);
  // ...
  res.sendStatus(204);
});
```

Nusii does not sign webhook deliveries, so put a long random secret in the endpoint URL and check it, and fetch the record from the API when you need to be sure of its current state. Responding with HTTP `410 Gone` removes the endpoint.

| Event | When |
| --- | --- |
| `proposal_created` | A proposal was created |
| `proposal_updated` | A proposal was updated |
| `proposal_destroyed` | A proposal was deleted |
| `proposal_sent` | A proposal was sent |
| `proposal_accepted` | The client accepted a proposal |
| `proposal_rejected` | The client rejected a proposal |
| `client_created` | A client was created |
| `client_updated` | A client was updated |
| `client_destroyed` | A client was deleted |
| `proposal_activity_client_viewed` | A client viewed something |
| `proposal_activity_client_viewed_proposal` | A client viewed a proposal |

The full list is exported as `WEBHOOK_EVENTS`.

### Themes, currencies, locales and PDF page sizes

The allowed values for `theme`, `currency`, `locale` and `pdf_page_size`:

```ts
await nusii.themes.list(); // [{ id: 'clean', name: 'Modern Theme' }, { id: 'classic', ... }]
await nusii.currencies.list(); // [{ id: 'USD', iso_code: 'USD', name: 'United States Dollar $' }, ...]
await nusii.locales.list(); // [{ id: 'en', code: 'en', name: 'English' }, ...]
await nusii.pdfPageSizes.list(); // [{ id: 'A4', name: 'A4' }, { id: 'US-Letter', ... }]
```

### CRM integrations

```ts
await nusii.integrations.createOnePageCrmInstallation({ api_key: '...', api_secret: '...' });
await nusii.integrations.createLessAnnoyingCrmInstallation({ token: '...', user_code: '...' });
```

## Pagination

List methods return one `Page` at a time:

```ts
const page = await nusii.proposals.list({ per_page: 50 });

page.data; // Proposal[]
page.meta; // { current_page: 1, next_page: 2, prev_page: null, total_pages: 4, total_count: 180 }

if (page.hasNextPage()) {
  const next = await page.getNextPage();
}
```

To walk through everything, use `listAll()`. It fetches the next page only when you reach it, and stops when you `break`:

```ts
for await (const proposal of nusii.proposals.listAll({ status: 'pending' })) {
  console.log(proposal.title);
}

// Or collect everything into an array (Node.js 22+)
const clients = await Array.fromAsync(nusii.clients.listAll());
```

A `Page` is iterable the same way: `for await (const item of page)` continues from that page to the last one.

## Error handling

Failed requests throw an error you can check with `instanceof`:

```ts
import { NotFoundError, NusiiError, RateLimitError, UnprocessableEntityError } from '@nusii/nusii';

try {
  await nusii.clients.create({ name: '', email: 'not-an-email' });
} catch (error) {
  if (error instanceof UnprocessableEntityError) {
    error.message; // "422 name can't be blank; email is invalid"
    error.errors; // [{ source: { pointer: '/data/attributes/name' }, detail: "can't be blank" }, ...]
  } else if (error instanceof NotFoundError) {
    // ...
  } else if (error instanceof RateLimitError) {
    error.retryAfter; // seconds
  } else if (error instanceof NusiiError) {
    // any other error from this library
  }
}
```

| Error | When |
| --- | --- |
| `BadRequestError` | 400: malformed request |
| `AuthenticationError` | 401: invalid or missing API key |
| `PaymentRequiredError` | 402: plan limit reached, e.g. active proposals |
| `ForbiddenError` | 403: not allowed, e.g. missing OAuth scope or unconfirmed sender email |
| `NotFoundError` | 404: record does not exist |
| `MethodNotAllowedError` | 405 |
| `NotAcceptableError` | 406 |
| `GoneError` | 410: record already deleted |
| `UnprocessableEntityError` | 422: validation failed, or the proposal is locked |
| `RateLimitError` | 429: too many requests |
| `ServerError` | 5xx |
| `ServiceUnavailableError` | 503 (a `ServerError`) |
| `ConnectionError` | No response: network down, DNS failure... |
| `TimeoutError` | The request took longer than `timeout` (a `ConnectionError`) |

All HTTP errors extend `APIError` and expose `status`, `headers`, the parsed `body`, the field `errors`, and a `code` when the API sends one (for example `proposal_locked`). Everything extends `NusiiError`.

## Retries, timeouts and cancellation

The Nusii API allows 100 requests per 30 seconds. The client handles the limit for you: a rate limited request is retried after the `Retry-After` delay the API asks for. Connection errors and 5xx responses are retried with exponential backoff, but only for reads (GET), so a proposal is never sent twice. By default a request is retried twice.

```ts
// For every request
const nusii = new Nusii({ maxRetries: 5, timeout: 10_000 });

// For one request
await nusii.proposals.list({}, { maxRetries: 0, timeout: 5_000 });

// Cancel with an AbortSignal
const controller = new AbortController();
const promise = nusii.proposals.list({}, { signal: controller.signal });
controller.abort();
```

## Configuration

```ts
const nusii = new Nusii({
  apiKey: 'your-api-key', // default: process.env.NUSII_API_KEY
  accessToken: 'oauth-token', // instead of apiKey, default: process.env.NUSII_ACCESS_TOKEN
  baseUrl: 'https://app.nusii.com', // default: process.env.NUSII_BASE_URL or https://app.nusii.com
  timeout: 30_000, // milliseconds per attempt
  maxRetries: 2,
  headers: { 'X-Request-Source': 'my-app' }, // added to every request
  fetch: customFetch, // e.g. for a proxy or tests
});
```

## OAuth

Apps that act on behalf of other Nusii accounts use OAuth 2.0 access tokens instead of API keys:

```ts
const nusii = new Nusii({ accessToken: userAccessToken });
```

Tokens with only the `read` scope can call GET endpoints; anything else throws a `ForbiddenError` with `code: 'insufficient_scope'`.

## Calling any endpoint

`nusii.request()` calls any API v2 endpoint with the same authentication, retries and error handling, and returns the JSON body as is:

```ts
const body = await nusii.request({
  method: 'GET',
  path: '/proposals',
  query: { status: 'draft', per: 10 },
});
```

## TypeScript

All types are exported:

```ts
import type {
  Client,
  Proposal,
  ProposalStatus,
  Section,
  LineItem,
  WebhookEvent,
  ClientCreateParams,
} from '@nusii/nusii';

function isOpen(proposal: Proposal): boolean {
  return proposal.status === 'draft' || proposal.status === 'pending';
}
```

## Requirements

- Node.js 20 or newer, Bun, Deno, Cloudflare Workers, Vercel Edge or any runtime with `fetch`
- TypeScript 5.0+ (optional)

## Development

```bash
git clone https://github.com/Nusii/nusii-typescript.git
cd nusii-typescript
npm install

npm test              # unit tests
npm run typecheck     # TypeScript
npm run lint          # Biome
npm run build         # build to dist/
npm run check         # all of the above
```

Integration tests run against a real Nusii account. Copy `.env.example` to `.env`, add your API key, and run:

```bash
npm run test:integration
```

They only read data unless you set `NUSII_INTEGRATION_WRITE=true`, in which case they create clients, proposals, sections, line items, taxes and a webhook endpoint, and delete them afterwards. To test against a local Nusii server, set `NUSII_BASE_URL=http://localhost:3000` in `.env`.

Releases are published to npm by GitHub Actions, see [RELEASING.md](RELEASING.md).

## Contributing

1. Fork it (https://github.com/Nusii/nusii-typescript/fork)
2. Create your feature branch (`git checkout -b improving-something`)
3. Commit your changes and add tests (`npm run check` must pass)
4. Push to the branch (`git push origin improving-something`)
5. Create a new Pull Request

## License

Released under the [MIT License](LICENSE).

---

Made by [Nusii](https://nusii.com), proposal software that helps you win more clients.
