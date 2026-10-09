import type { PaginationMeta } from './types';

/**
 * One page of a paginated list.
 *
 * Iterate it with `for await` to walk through every item of every following
 * page; the next pages are fetched lazily as you go.
 */
export class Page<T> implements AsyncIterable<T> {
  /** Items on this page. */
  readonly data: T[];
  /** Pagination details: current page, total pages and total count. */
  readonly meta: PaginationMeta;

  readonly #fetchPage: (page: number) => Promise<Page<T>>;

  constructor(data: T[], meta: PaginationMeta, fetchPage: (page: number) => Promise<Page<T>>) {
    this.data = data;
    this.meta = meta;
    this.#fetchPage = fetchPage;
  }

  hasNextPage(): boolean {
    return this.meta.next_page !== null;
  }

  hasPreviousPage(): boolean {
    return this.meta.prev_page !== null;
  }

  /** Fetches the next page, or returns `null` on the last page. */
  async getNextPage(): Promise<Page<T> | null> {
    return this.meta.next_page === null ? null : this.#fetchPage(this.meta.next_page);
  }

  /** Fetches the previous page, or returns `null` on the first page. */
  async getPreviousPage(): Promise<Page<T> | null> {
    return this.meta.prev_page === null ? null : this.#fetchPage(this.meta.prev_page);
  }

  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    let page: Page<T> | null = this;
    while (page) {
      yield* page.data;
      page = await page.getNextPage();
    }
  }
}
