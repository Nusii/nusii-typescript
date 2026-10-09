// Runs against a real Nusii account: npm run test:integration
//
// Reads credentials from .env (see .env.example). Skipped without them.
// Read-only by default. Set NUSII_INTEGRATION_WRITE=true to also create
// clients, proposals, sections, line items, taxes and a webhook endpoint,
// which are deleted afterwards. Set NUSII_INTEGRATION_SEND_TO=you@example.com
// to also send the test proposal to that address (this sends a real email).

import { existsSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  AuthenticationError,
  GoneError,
  NotFoundError,
  Nusii,
  type Proposal,
  type Section,
  UnprocessableEntityError,
} from '../src';

if (existsSync('.env')) process.loadEnvFile('.env');

const hasCredentials = Boolean(process.env['NUSII_API_KEY'] || process.env['NUSII_ACCESS_TOKEN']);
const allowWrites = process.env['NUSII_INTEGRATION_WRITE'] === 'true';
const sendTo = process.env['NUSII_INTEGRATION_SEND_TO'];

describe.skipIf(!hasCredentials)('Nusii API (live, read only)', () => {
  let nusii: Nusii;
  beforeAll(() => {
    nusii = new Nusii();
  });

  it('fetches the account', async () => {
    const account = await nusii.account.me();
    expect(account.id).toBeTypeOf('number');
    expect(account.name).toBeTypeOf('string');
  });

  it.each([
    'clients',
    'proposals',
    'templates',
    'users',
    'proposalActivities',
    'webhookEndpoints',
    'sections',
  ] as const)('lists %s', async (name) => {
    const page = await nusii[name].list({ per_page: 2 });
    expect(Array.isArray(page.data)).toBe(true);
    expect(page.meta.total_count).toBeGreaterThanOrEqual(page.data.length);
    for (const item of page.data) expect(item.id).toBeTypeOf('number');
  });

  it.each(['themes', 'currencies', 'locales', 'pdfPageSizes'] as const)(
    'lists %s',
    async (name) => {
      const list = await nusii[name].list();
      expect(list.length).toBeGreaterThan(0);
      expect(list[0]?.id).toBeTypeOf('string');
    },
  );

  it('throws NotFoundError for a missing record', async () => {
    await expect(nusii.clients.get(0)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws AuthenticationError for an invalid key', async () => {
    const invalid = new Nusii({ apiKey: 'invalid-key', baseUrl: nusii.baseUrl });
    await expect(invalid.account.me()).rejects.toBeInstanceOf(AuthenticationError);
  });
});

describe.skipIf(!hasCredentials || !allowWrites)('Nusii API (live, writes)', () => {
  let nusii: Nusii;
  const cleanup: (() => Promise<unknown>)[] = [];
  const stamp = Date.now();

  beforeAll(() => {
    nusii = new Nusii();
  });

  afterAll(async () => {
    for (const step of cleanup.reverse()) await step().catch(() => {});
  });

  it('manages webhook endpoints', async () => {
    const endpoint = await nusii.webhookEndpoints.create({
      target_url: `https://example.com/nusii-sdk-test/${stamp}`,
      events: ['proposal_accepted'],
    });
    cleanup.push(() => nusii.webhookEndpoints.delete(endpoint.id));

    expect(endpoint.events).toEqual(['proposal_accepted']);
    await expect(nusii.webhookEndpoints.get(endpoint.id)).resolves.toEqual(endpoint);

    const ids: number[] = [];
    for await (const item of nusii.webhookEndpoints.listAll()) ids.push(item.id);
    expect(ids).toContain(endpoint.id);

    await expect(nusii.webhookEndpoints.delete(endpoint.id)).resolves.toMatchObject({
      id: endpoint.id,
    });
    await expect(nusii.webhookEndpoints.get(endpoint.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('builds, prices and archives a proposal', async () => {
    const email = `sdk-test+${stamp}@example.com`;
    const client = await nusii.clients.create({ name: 'SDK', surname: 'Test', email });
    cleanup.push(() => nusii.clients.delete(client.id));
    expect(client.full_name).toBe('SDK Test');

    const invalid = await nusii.clients
      .create({ name: '', email: 'invalid' })
      .catch((error: unknown) => error);
    expect(invalid).toBeInstanceOf(UnprocessableEntityError);
    expect((invalid as UnprocessableEntityError).errors.length).toBeGreaterThan(0);

    await nusii.clients.update(client.id, { business: 'SDK Test Inc' });
    const found = await nusii.clients.list({ email });
    expect(found.data.map((c) => [c.id, c.business])).toEqual([[client.id, 'SDK Test Inc']]);

    const proposal: Proposal = await nusii.proposals.create({
      title: `SDK test ${stamp}`,
      client_id: client.id,
      expires_at: '2099-12-31',
    });
    cleanup.push(() => nusii.proposals.delete(proposal.id));
    expect(proposal.status).toBe('draft');
    expect(proposal.client_email).toBe(email);

    const renamed = await nusii.proposals.update(proposal.id, { title: `SDK test ${stamp} v2` });
    expect(renamed.title).toBe(`SDK test ${stamp} v2`);

    const statusChange = await nusii.proposals
      .update(proposal.id, { status: 'accepted' } as never)
      .catch((error: unknown) => error);
    expect(statusChange).toBeInstanceOf(UnprocessableEntityError);
    expect((statusChange as UnprocessableEntityError).code).toBe('status_not_writable');

    const search = await nusii.proposals.list({ query: `SDK test ${stamp}` });
    expect(search.data.map((p) => p.id)).toEqual([proposal.id]);

    // A cost section with line items
    const section: Section = await nusii.sections.create({
      proposal_id: proposal.id,
      title: 'Costs',
      section_type: 'cost',
    });
    cleanup.push(() => nusii.sections.delete(section.id));
    expect(section.name).toBe('Costs');

    const design = await nusii.lineItems.create(section.id, {
      name: 'Design',
      cost_type: 'fixed',
      amount: 150_000,
    });
    const hours = await nusii.lineItems.create(section.id, {
      name: 'Development',
      cost_type: 'per',
      per_type: 'hour',
      quantity: 10,
      amount: 7_500,
    });
    expect(hours.total_in_cents).toBe(75_000);

    const updated = await nusii.lineItems.update(hours.id, { quantity: 12 });
    expect(Number(updated.quantity)).toBe(12);
    expect(updated.total_in_cents).toBe(90_000);
    await expect(nusii.lineItems.get(hours.id)).resolves.toMatchObject({ name: 'Development' });

    const items = await nusii.lineItems.list(section.id);
    expect(items.map((i) => i.id)).toEqual([design.id, hours.id]);

    const withItems = await nusii.sections.get(section.id);
    expect(withItems.line_items?.map((i) => i.id).sort()).toEqual([design.id, hours.id].sort());
    expect(withItems.total_in_cents).toBe(240_000);

    const listed = await nusii.sections.list({ proposal_id: proposal.id });
    const listedSection = listed.data.find((s) => s.id === section.id);
    expect(listedSection?.line_items).toHaveLength(2);

    // Price ranges are behind a feature flag: either works or explains why not.
    const range = await nusii.lineItems
      .create(section.id, { name: 'Range', cost_type: 'range', amount: 1, maximum_amount: 2 })
      .catch((error: unknown) => error);
    if (range instanceof UnprocessableEntityError) {
      expect(range.code).toBe('cost_type_not_available');
    } else {
      expect(range).toMatchObject({ maximum_amount_in_cents: 2 });
    }

    // Taxes
    const vat = await nusii.taxations.create(proposal.id, { name: 'VAT', percentage: 21 });
    expect(Number(vat.percentage)).toBe(21);
    const changed = await nusii.taxations.update(proposal.id, vat.id, { percentage: 9.5 });
    expect(Number(changed.percentage)).toBe(9.5);
    await expect(nusii.taxations.list(proposal.id)).resolves.toMatchObject([{ id: vat.id }]);
    await nusii.taxations.delete(proposal.id, vat.id);
    await expect(nusii.taxations.list(proposal.id)).resolves.toEqual([]);

    // Reusable sections: create in the content library, copy into the proposal
    const reusable = await nusii.sections.create({
      title: `Reusable ${stamp}`,
      body: '<p>About us</p>',
      section_type: 'text',
      reusable: true,
    });
    cleanup.push(() => nusii.sections.delete(reusable.id));
    expect(reusable.proposal_id).toBeNull();

    const library: number[] = [];
    for await (const item of nusii.sections.listAll()) library.push(item.id);
    expect(library).toContain(reusable.id);

    const copy = await nusii.sections.copy(reusable.id, { proposal_id: proposal.id });
    cleanup.push(() => nusii.sections.delete(copy.id));
    expect(copy.id).not.toBe(reusable.id);
    expect(copy.proposal_id).toBe(proposal.id);
    expect(copy.title).toBe(`Reusable ${stamp}`);

    // Deleting twice
    await nusii.sections.delete(copy.id);
    await expect(nusii.sections.delete(copy.id)).rejects.toBeInstanceOf(GoneError);

    // Activities of the proposal
    const activities = await nusii.proposalActivities.list({ proposal_id: proposal.id });
    expect(Array.isArray(activities.data)).toBe(true);

    // Optional: really send it
    if (sendTo) {
      const result = await nusii.proposals.send(proposal.id, {
        recipients: [{ name: 'SDK Test', email: sendTo }],
        subject: 'Nusii TypeScript SDK test',
        message: '<p>Sent by the nusii-typescript integration tests.</p>',
      });
      expect(result.status).toBe('pending');
      expect(result.sent_at).toBeTruthy();
    }

    // Archive
    const archived = await nusii.proposals.archive(proposal.id);
    expect(archived.archived_at).not.toBeNull();
    const inArchive = await nusii.proposals.list({ archived: true, query: `SDK test ${stamp}` });
    expect(inArchive.data.map((p) => p.id)).toEqual([proposal.id]);
    const notInActive = await nusii.proposals.list({ query: `SDK test ${stamp}` });
    expect(notInActive.data).toEqual([]);
  });

  it('creates a proposal from a template', async () => {
    const { data: templates } = await nusii.templates.list({ per_page: 1 });
    const template = templates[0];
    if (!template) return;

    const proposal = await nusii.proposals.create({
      title: `SDK template test ${stamp}`,
      template_id: template.id,
    });
    cleanup.push(() => nusii.proposals.delete(proposal.id));

    const templateSections = await nusii.sections.list({ template_id: template.id });
    const proposalSections = await nusii.sections.list({ proposal_id: proposal.id });
    expect(proposalSections.meta.total_count).toBe(templateSections.meta.total_count);

    await nusii.proposals.delete(proposal.id);
    await expect(nusii.proposals.get(proposal.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});
