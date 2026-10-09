import { describe, expect, it } from 'vitest';
import type { Nusii } from '../src';
import { createClient, json, meta, resource } from './helpers';

const one = (type: string) => json({ data: resource(type, 7, { name: 'x' }) });
const many = (type: string) => json({ data: [resource(type, 7, { name: 'x' })], meta: meta() });
const plain = () => json([{ id: 'x', name: 'X' }]);

interface Case {
  name: string;
  call: (nusii: Nusii) => Promise<unknown>;
  response: Response;
  method: string;
  path: string;
  query?: Record<string, string | string[]>;
  body?: unknown;
}

const cases: Case[] = [
  // Account
  {
    name: 'account.me',
    call: (n) => n.account.me(),
    response: one('accounts'),
    method: 'GET',
    path: '/account/me',
  },

  // Clients
  {
    name: 'clients.list',
    call: (n) => n.clients.list({ query: 'acme', emails: ['a@x.com', 'b@x.com'] }),
    response: many('clients'),
    method: 'GET',
    path: '/clients',
    query: { query: 'acme', emails: 'a@x.com,b@x.com', page: '1' },
  },
  {
    name: 'clients.get',
    call: (n) => n.clients.get(7),
    response: one('clients'),
    method: 'GET',
    path: '/clients/7',
  },
  {
    name: 'clients.create',
    call: (n) => n.clients.create({ name: 'Jane', email: 'jane@example.com', currency: 'EUR' }),
    response: one('clients'),
    method: 'POST',
    path: '/clients',
    body: { client: { name: 'Jane', email: 'jane@example.com', currency: 'EUR' } },
  },
  {
    name: 'clients.update',
    call: (n) => n.clients.update('7', { business: 'Acme' }),
    response: one('clients'),
    method: 'PUT',
    path: '/clients/7',
    body: { client: { business: 'Acme' } },
  },
  {
    name: 'clients.delete',
    call: (n) => n.clients.delete(7),
    response: one('clients'),
    method: 'DELETE',
    path: '/clients/7',
  },

  // Proposals
  {
    name: 'proposals.list',
    call: (n) =>
      n.proposals.list({
        statuses: ['pending', 'accepted'],
        archived: true,
        recipient_emails: ['a@x.com', 'b@x.com'],
        sent_at_after: '2026-01-01',
        per_page: 50,
      }),
    response: many('proposals'),
    method: 'GET',
    path: '/proposals',
    query: {
      'statuses[]': ['pending', 'accepted'],
      archived: 'true',
      recipient_emails: 'a@x.com,b@x.com',
      sent_at_after: '2026-01-01',
      page: '1',
      per: '50',
    },
  },
  {
    name: 'proposals.get',
    call: (n) => n.proposals.get(7),
    response: one('proposals'),
    method: 'GET',
    path: '/proposals/7',
  },
  {
    name: 'proposals.create',
    call: (n) => n.proposals.create({ title: 'Website', client_id: 3, template_id: 9 }),
    response: one('proposals'),
    method: 'POST',
    path: '/proposals',
    body: { proposal: { title: 'Website', client_id: 3, template_id: 9 } },
  },
  {
    name: 'proposals.create without params',
    call: (n) => n.proposals.create(),
    response: one('proposals'),
    method: 'POST',
    path: '/proposals',
    body: { proposal: {} },
  },
  {
    name: 'proposals.update',
    call: (n) => n.proposals.update(7, { expires_at: '2026-12-31' }),
    response: one('proposals'),
    method: 'PUT',
    path: '/proposals/7',
    body: { proposal: { expires_at: '2026-12-31' } },
  },
  {
    name: 'proposals.delete',
    call: (n) => n.proposals.delete(7),
    response: one('proposals'),
    method: 'DELETE',
    path: '/proposals/7',
  },
  {
    name: 'proposals.archive',
    call: (n) => n.proposals.archive(7),
    response: one('proposals'),
    method: 'PUT',
    path: '/proposals/7/archive',
  },
  {
    name: 'proposals.send',
    call: (n) =>
      n.proposals.send(7, {
        recipients: [{ name: 'Jane', email: 'jane@example.com', eligible_to_sign: true }],
        cc: 'boss@example.com',
        subject: 'Your proposal',
        sender_email: 'me@example.com',
      }),
    response: json({ status: 'pending', sent_at: '2026-10-09T10:00:00Z' }),
    method: 'PUT',
    path: '/proposals/7/send_proposal',
    body: {
      recipients: [{ name: 'Jane', email: 'jane@example.com', eligible_to_sign: true }],
      cc: 'boss@example.com',
      subject: 'Your proposal',
      sender_email: 'me@example.com',
    },
  },

  // Sections
  {
    name: 'sections.list',
    call: (n) => n.sections.list({ proposal_id: 3 }),
    response: many('sections'),
    method: 'GET',
    path: '/sections',
    query: { proposal_id: '3', page: '1' },
  },
  {
    name: 'sections.get',
    call: (n) => n.sections.get(7),
    response: one('sections'),
    method: 'GET',
    path: '/sections/7',
  },
  {
    name: 'sections.create',
    call: (n) => n.sections.create({ proposal_id: 3, title: 'Scope', section_type: 'cost' }),
    response: one('sections'),
    method: 'POST',
    path: '/sections',
    body: { section: { proposal_id: 3, title: 'Scope', section_type: 'cost' } },
  },
  {
    name: 'sections.copy',
    call: (n) => n.sections.copy(42, { proposal_id: 3, position: 2 }),
    response: one('sections'),
    method: 'POST',
    path: '/sections',
    body: { section_id: 42, section: { reusable: false, proposal_id: 3, position: 2 } },
  },
  {
    name: 'sections.update',
    call: (n) => n.sections.update(7, { body: '<p>Hi</p>' }),
    response: one('sections'),
    method: 'PUT',
    path: '/sections/7',
    body: { section: { body: '<p>Hi</p>' } },
  },
  {
    name: 'sections.delete',
    call: (n) => n.sections.delete(7),
    response: one('sections'),
    method: 'DELETE',
    path: '/sections/7',
  },

  // Line items
  {
    name: 'lineItems.list',
    call: (n) => n.lineItems.list(3),
    response: many('line_items'),
    method: 'GET',
    path: '/sections/3/line_items',
  },
  {
    name: 'lineItems.get',
    call: (n) => n.lineItems.get(7),
    response: one('line_items'),
    method: 'GET',
    path: '/line_items/7',
  },
  {
    name: 'lineItems.create',
    call: (n) =>
      n.lineItems.create(3, { name: 'Design', cost_type: 'range', amount: 5, maximum_amount: 8 }),
    response: one('line_items'),
    method: 'POST',
    path: '/sections/3/line_items',
    body: { line_item: { name: 'Design', cost_type: 'range', amount: 5, maximum_amount: 8 } },
  },
  {
    name: 'lineItems.update',
    call: (n) => n.lineItems.update(7, { quantity: 2.5 }),
    response: one('line_items'),
    method: 'PUT',
    path: '/line_items/7',
    body: { line_item: { quantity: 2.5 } },
  },
  {
    name: 'lineItems.delete',
    call: (n) => n.lineItems.delete(7),
    response: one('line_items'),
    method: 'DELETE',
    path: '/line_items/7',
  },

  // Taxations: the body is not nested under a root key
  {
    name: 'taxations.list',
    call: (n) => n.taxations.list(3),
    response: many('taxations'),
    method: 'GET',
    path: '/proposals/3/taxations',
  },
  {
    name: 'taxations.create',
    call: (n) => n.taxations.create(3, { name: 'VAT', percentage: 21 }),
    response: one('taxations'),
    method: 'POST',
    path: '/proposals/3/taxations',
    body: { name: 'VAT', percentage: 21 },
  },
  {
    name: 'taxations.update',
    call: (n) => n.taxations.update(3, 7, { percentage: '9.5' }),
    response: one('taxations'),
    method: 'PUT',
    path: '/proposals/3/taxations/7',
    body: { percentage: '9.5' },
  },
  {
    name: 'taxations.delete',
    call: (n) => n.taxations.delete(3, 7),
    response: one('taxations'),
    method: 'DELETE',
    path: '/proposals/3/taxations/7',
  },

  // Templates
  {
    name: 'templates.list',
    call: (n) => n.templates.list({ public_templates: true }),
    response: many('templates'),
    method: 'GET',
    path: '/templates',
    query: { public_templates: 'true', page: '1' },
  },
  {
    name: 'templates.get',
    call: (n) => n.templates.get(7),
    response: one('templates'),
    method: 'GET',
    path: '/templates/7',
  },

  // Proposal activities
  {
    name: 'proposalActivities.list',
    call: (n) => n.proposalActivities.list({ client_id: 3 }),
    response: many('proposal_activities'),
    method: 'GET',
    path: '/proposal_activities',
    query: { client_id: '3', page: '1' },
  },
  {
    name: 'proposalActivities.get',
    call: (n) => n.proposalActivities.get(7),
    response: one('proposal_activities'),
    method: 'GET',
    path: '/proposal_activities/7',
  },

  // Users
  {
    name: 'users.list',
    call: (n) => n.users.list({ page: 2 }),
    response: many('users'),
    method: 'GET',
    path: '/users',
    query: { page: '2' },
  },

  // Webhook endpoints
  {
    name: 'webhookEndpoints.list',
    call: (n) => n.webhookEndpoints.list(),
    response: many('webhook_endpoints'),
    method: 'GET',
    path: '/webhook_endpoints',
    query: { page: '1' },
  },
  {
    name: 'webhookEndpoints.get',
    call: (n) => n.webhookEndpoints.get(7),
    response: one('webhook_endpoints'),
    method: 'GET',
    path: '/webhook_endpoints/7',
  },
  {
    name: 'webhookEndpoints.create',
    call: (n) =>
      n.webhookEndpoints.create({
        target_url: 'https://example.com/hook',
        events: ['proposal_accepted'],
      }),
    response: one('webhook_endpoints'),
    method: 'POST',
    path: '/webhook_endpoints',
    body: {
      webhook_endpoint: { target_url: 'https://example.com/hook', events: ['proposal_accepted'] },
    },
  },
  {
    name: 'webhookEndpoints.delete',
    call: (n) => n.webhookEndpoints.delete(7),
    response: one('webhook_endpoints'),
    method: 'DELETE',
    path: '/webhook_endpoints/7',
  },

  // Reference data
  {
    name: 'themes.list',
    call: (n) => n.themes.list(),
    response: plain(),
    method: 'GET',
    path: '/themes',
  },
  {
    name: 'currencies.list',
    call: (n) => n.currencies.list(),
    response: plain(),
    method: 'GET',
    path: '/currencies',
  },
  {
    name: 'locales.list',
    call: (n) => n.locales.list(),
    response: plain(),
    method: 'GET',
    path: '/locales',
  },
  {
    name: 'pdfPageSizes.list',
    call: (n) => n.pdfPageSizes.list(),
    response: plain(),
    method: 'GET',
    path: '/pdf_page_sizes',
  },

  // Integrations
  {
    name: 'integrations.createOnePageCrmInstallation',
    call: (n) =>
      n.integrations.createOnePageCrmInstallation({ name: 'CRM', api_key: 'k', api_secret: 's' }),
    response: one('one_page_crm_installations'),
    method: 'POST',
    path: '/integrations/one_page_crm_installations',
    body: { one_page_crm_installation: { name: 'CRM', api_key: 'k', api_secret: 's' } },
  },
  {
    name: 'integrations.createLessAnnoyingCrmInstallation',
    call: (n) =>
      n.integrations.createLessAnnoyingCrmInstallation({ token: 't', user_code: 'u', user_id: 1 }),
    response: one('less_annoying_crm_installations'),
    method: 'POST',
    path: '/integrations/less_annoying_crm_installations',
    body: { less_annoying_crm_installation: { token: 't', user_code: 'u', user_id: 1 } },
  },
];

describe.each(cases)('$name', ({ call, response, method, path, query = {}, body }) => {
  it(`sends ${method} ${path}`, async () => {
    const { nusii, requests } = createClient([response]);
    await call(nusii);

    const request = requests[0];
    expect(request?.method).toBe(method);
    expect(request?.url.pathname).toBe(`/api/v2${path}`);

    const sent: Record<string, string | string[]> = {};
    for (const key of new Set(request?.url.searchParams.keys())) {
      const values = request?.url.searchParams.getAll(key) ?? [];
      sent[key] = key.endsWith('[]') ? values : (values[0] ?? '');
    }
    expect(sent).toEqual(query);
    expect(request?.body).toEqual(body);
  });
});

describe('responses', () => {
  it('flattens a JSON:API resource into a plain object with a numeric id', async () => {
    const { nusii } = createClient([
      json({ data: resource('clients', 12, { name: 'Jane', email: 'jane@example.com' }) }),
    ]);
    await expect(nusii.clients.get(12)).resolves.toEqual({
      id: 12,
      name: 'Jane',
      email: 'jane@example.com',
    });
  });

  it('attaches the included line items to their section', async () => {
    const lineItem = (id: number) => resource('line_items', id, { name: `Item ${id}` });
    const { nusii } = createClient([
      json({
        data: resource(
          'sections',
          5,
          { title: 'Costs', section_type: 'cost' },
          {
            line_items: {
              data: [
                { id: '1', type: 'line_items' },
                { id: '2', type: 'line_items' },
              ],
            },
          },
        ),
        included: [lineItem(2), lineItem(1)],
      }),
    ]);

    const section = await nusii.sections.get(5);
    expect(section.line_items).toEqual([
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
    ]);
  });

  it('attaches line items per section on a list', async () => {
    const { nusii } = createClient([
      json({
        data: [
          resource('sections', 1, {}, { line_items: { data: [{ id: '10', type: 'line_items' }] } }),
          resource('sections', 2, {}, { line_items: { data: [] } }),
          resource('sections', 3, { section_type: 'text' }),
        ],
        included: [resource('line_items', 10, { name: 'Hosting' })],
        meta: meta(),
      }),
    ]);

    const { data } = await nusii.sections.list({ proposal_id: 1 });
    expect(data[0]?.line_items).toEqual([{ id: 10, name: 'Hosting' }]);
    expect(data[1]?.line_items).toEqual([]);
    expect(data[2]).not.toHaveProperty('line_items');
  });

  it('leaves out relationships that are not included', async () => {
    const { nusii } = createClient([
      json({
        data: resource(
          'proposals',
          1,
          { title: 'Website' },
          { recipients: { data: [{ id: '4', type: 'recipients' }] } },
        ),
      }),
    ]);
    await expect(nusii.proposals.get(1)).resolves.toEqual({ id: 1, title: 'Website' });
  });

  it('returns plain arrays for reference data', async () => {
    const themes = [
      { id: 'clean', name: 'Modern Theme' },
      { id: 'classic', name: 'Classic Theme' },
    ];
    const { nusii } = createClient([json(themes)]);
    await expect(nusii.themes.list()).resolves.toEqual(themes);
  });

  it('returns the send result as is', async () => {
    const result = { status: 'pending', sent_at: '2026-10-09', sender_id: 1, sender_name: 'Me' };
    const { nusii } = createClient([json(result)]);
    await expect(nusii.proposals.send(1, { email: 'a@b.c' })).resolves.toEqual(result);
  });

  it('url-encodes ids', async () => {
    const { nusii, requests } = createClient([one('clients')]);
    await nusii.clients.get('7/../../admin');
    expect(requests[0]?.url.pathname).toBe('/api/v2/clients/7%2F..%2F..%2Fadmin');
  });
});
