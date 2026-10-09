import type { HttpMethod, Nusii, QueryValue, RequestOptions } from '../client';
import { deserializeMany, deserializeOne, type JsonApiDocument } from '../jsonapi';
import { Page } from '../pagination';
import type { ID, PaginationParams } from '../types';

export abstract class APIResource {
  protected readonly client: Nusii;

  constructor(client: Nusii) {
    this.client = client;
  }

  /** Requests a single JSON:API resource and flattens it. */
  protected async resource<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    const document = await this.client.request<JsonApiDocument>({ method, path, body }, options);
    return deserializeOne<T>(document);
  }

  /** Requests an unpaginated JSON:API collection and flattens it. */
  protected async collection<T>(path: string, options?: RequestOptions): Promise<T[]> {
    const document = await this.client.request<JsonApiDocument>({ method: 'GET', path }, options);
    return deserializeMany<T>(document);
  }

  /** Requests a page of a paginated JSON:API collection. */
  protected async page<T>(
    path: string,
    params: PaginationParams & Record<string, QueryValue>,
    options?: RequestOptions,
  ): Promise<Page<T>> {
    const { page = 1, per_page, ...filters } = params;

    const fetchPage = async (pageNumber: number): Promise<Page<T>> => {
      const document = await this.client.request<JsonApiDocument>(
        { method: 'GET', path, query: { ...filters, page: pageNumber, per: per_page } },
        options,
      );
      const data = deserializeMany<T>(document);
      const meta = document.meta ?? {};
      return new Page(
        data,
        {
          current_page: meta.current_page ?? pageNumber,
          next_page: meta.next_page ?? null,
          prev_page: meta.prev_page ?? null,
          total_pages: meta.total_pages ?? 1,
          total_count: meta.total_count ?? data.length,
        },
        fetchPage,
      );
    };

    return fetchPage(page);
  }

  /** Lazily yields every item of every page. */
  protected async *all<T>(
    path: string,
    params: PaginationParams & Record<string, QueryValue>,
    options?: RequestOptions,
  ): AsyncGenerator<T, void, undefined> {
    yield* await this.page<T>(path, params, options);
  }
}

/** Encodes an id for use in a URL path. */
export function id(value: ID): string {
  return encodeURIComponent(String(value));
}

/** Turns `['a@x.com', 'b@x.com']` into the comma separated form the API expects. */
export function commaList(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value.join(',') : value;
}
