import { describe, expect, it } from 'vitest';
import { Page } from '../src';
import { createClient, json, meta, resource } from './helpers';

const client = (id: number) => resource('clients', id, { name: `Client ${id}` });

const pages = () => [
  json({
    data: [client(1), client(2)],
    meta: meta({ current_page: 1, next_page: 2, total_pages: 3, total_count: 5 }),
  }),
  json({
    data: [client(3), client(4)],
    meta: meta({ current_page: 2, next_page: 3, prev_page: 1, total_pages: 3, total_count: 5 }),
  }),
  json({
    data: [client(5)],
    meta: meta({ current_page: 3, prev_page: 2, total_pages: 3, total_count: 5 }),
  }),
];

describe('Page', () => {
  it('flattens the items and exposes the pagination meta', async () => {
    const { nusii, requests } = createClient([pages()[0] as Response]);
    const page = await nusii.clients.list({ per_page: 2, query: 'acme' });

    expect(page).toBeInstanceOf(Page);
    expect(page.data).toEqual([
      { id: 1, name: 'Client 1' },
      { id: 2, name: 'Client 2' },
    ]);
    expect(page.meta).toEqual({
      current_page: 1,
      next_page: 2,
      prev_page: null,
      total_pages: 3,
      total_count: 5,
    });
    expect(page.hasNextPage()).toBe(true);
    expect(page.hasPreviousPage()).toBe(false);

    const params = requests[0]?.url.searchParams;
    expect(params?.get('page')).toBe('1');
    expect(params?.get('per')).toBe('2');
    expect(params?.get('query')).toBe('acme');
    expect(params?.has('per_page')).toBe(false);
  });

  it('fetches the next and previous page with the same filters', async () => {
    const { nusii, requests } = createClient([...pages().slice(0, 2), pages()[0] as Response]);
    const first = await nusii.clients.list({ per_page: 2, email: 'a@b.c' });
    const second = await first.getNextPage();

    expect(second?.data.map((c) => c.id)).toEqual([3, 4]);
    expect(requests[1]?.url.searchParams.get('page')).toBe('2');
    expect(requests[1]?.url.searchParams.get('per')).toBe('2');
    expect(requests[1]?.url.searchParams.get('email')).toBe('a@b.c');

    const back = await second?.getPreviousPage();
    expect(back?.data.map((c) => c.id)).toEqual([1, 2]);
  });

  it('returns null past the last page', async () => {
    const { nusii } = createClient([pages()[2] as Response]);
    const last = await nusii.clients.list({ page: 3 });
    expect(last.hasNextPage()).toBe(false);
    await expect(last.getNextPage()).resolves.toBeNull();
  });

  it('iterates every item of every page with for await', async () => {
    const { nusii } = createClient(pages());
    const ids: number[] = [];
    for await (const item of await nusii.clients.list()) ids.push(item.id);
    expect(ids).toEqual([1, 2, 3, 4, 5]);
  });

  it('fills in missing meta', async () => {
    const { nusii } = createClient([json({ data: [client(1)] })]);
    const page = await nusii.clients.list({ page: 4 });
    expect(page.meta).toEqual({
      current_page: 4,
      next_page: null,
      prev_page: null,
      total_pages: 1,
      total_count: 1,
    });
  });
});

describe('listAll', () => {
  it('yields every item, fetching pages lazily', async () => {
    const { nusii, requests } = createClient(pages());
    const iterator = nusii.clients.listAll({ per_page: 2 });

    const first = await iterator.next();
    expect(first.value).toMatchObject({ id: 1 });
    expect(requests).toHaveLength(1);

    const rest: number[] = [];
    for await (const item of iterator) rest.push(item.id);
    expect(rest).toEqual([2, 3, 4, 5]);
    expect(requests).toHaveLength(3);
  });

  it('stops fetching when the loop breaks', async () => {
    const { nusii, requests } = createClient(pages());
    for await (const item of nusii.clients.listAll()) {
      if (item.id === 2) break;
    }
    expect(requests).toHaveLength(1);
  });
});
