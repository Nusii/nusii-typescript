// Lists of allowed values. These endpoints return plain JSON arrays, not JSON:API.

import type { RequestOptions } from '../client';
import type { Currency, Locale, PdfPageSize, Theme } from '../types';
import { APIResource } from './resource';

export class ThemesResource extends APIResource {
  /** Proposal themes. Use a theme's `id` as a proposal's `theme`. */
  list(options?: RequestOptions): Promise<Theme[]> {
    return this.client.request({ method: 'GET', path: '/themes' }, options);
  }
}

export class CurrenciesResource extends APIResource {
  /** Supported currencies. Use `iso_code` for a client's or proposal's `currency`. */
  list(options?: RequestOptions): Promise<Currency[]> {
    return this.client.request({ method: 'GET', path: '/currencies' }, options);
  }
}

export class LocalesResource extends APIResource {
  /** Supported languages. Use `code` for a client's `locale`. */
  list(options?: RequestOptions): Promise<Locale[]> {
    return this.client.request({ method: 'GET', path: '/locales' }, options);
  }
}

export class PdfPageSizesResource extends APIResource {
  /** Supported PDF page sizes. Use `id` for a client's `pdf_page_size`. */
  list(options?: RequestOptions): Promise<PdfPageSize[]> {
    return this.client.request({ method: 'GET', path: '/pdf_page_sizes' }, options);
  }
}
