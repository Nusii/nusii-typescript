import type { RequestOptions } from '../client';
import type { ID, LineItem, LineItemCreateParams, LineItemUpdateParams } from '../types';
import { APIResource, id } from './resource';

export class LineItemsResource extends APIResource {
  /** All line items of a section, ordered by position. */
  list(sectionId: ID, options?: RequestOptions): Promise<LineItem[]> {
    return this.collection(`/sections/${id(sectionId)}/line_items`, options);
  }

  get(lineItemId: ID, options?: RequestOptions): Promise<LineItem> {
    return this.resource('GET', `/line_items/${id(lineItemId)}`, undefined, options);
  }

  /**
   * Adds a line item to a cost section. Amounts are in cents.
   *
   * @example
   * ```ts
   * await nusii.lineItems.create(sectionId, {
   *   name: 'Design work',
   *   cost_type: 'per',
   *   per_type: 'hour',
   *   quantity: 10,
   *   amount: 7500,
   * });
   * ```
   */
  create(sectionId: ID, params: LineItemCreateParams, options?: RequestOptions): Promise<LineItem> {
    return this.resource(
      'POST',
      `/sections/${id(sectionId)}/line_items`,
      { line_item: params },
      options,
    );
  }

  update(
    lineItemId: ID,
    params: LineItemUpdateParams,
    options?: RequestOptions,
  ): Promise<LineItem> {
    return this.resource('PUT', `/line_items/${id(lineItemId)}`, { line_item: params }, options);
  }

  /** Deletes the line item and returns it as it was. */
  delete(lineItemId: ID, options?: RequestOptions): Promise<LineItem> {
    return this.resource('DELETE', `/line_items/${id(lineItemId)}`, undefined, options);
  }
}
