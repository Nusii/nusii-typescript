import type { RequestOptions } from '../client';
import type { ID, Taxation, TaxationCreateParams, TaxationUpdateParams } from '../types';
import { APIResource, id } from './resource';

export class TaxationsResource extends APIResource {
  /** All taxes and discounts of a proposal. */
  list(proposalId: ID, options?: RequestOptions): Promise<Taxation[]> {
    return this.collection(`/proposals/${id(proposalId)}/taxations`, options);
  }

  /**
   * Adds a tax (or, with a negative percentage, a discount) to a proposal.
   *
   * @example
   * ```ts
   * await nusii.taxations.create(proposalId, { name: 'VAT', percentage: 21 });
   * ```
   */
  create(
    proposalId: ID,
    params: TaxationCreateParams,
    options?: RequestOptions,
  ): Promise<Taxation> {
    return this.resource('POST', `/proposals/${id(proposalId)}/taxations`, params, options);
  }

  update(
    proposalId: ID,
    taxationId: ID,
    params: TaxationUpdateParams,
    options?: RequestOptions,
  ): Promise<Taxation> {
    return this.resource(
      'PUT',
      `/proposals/${id(proposalId)}/taxations/${id(taxationId)}`,
      params,
      options,
    );
  }

  /** Removes the tax and returns it as it was. */
  delete(proposalId: ID, taxationId: ID, options?: RequestOptions): Promise<Taxation> {
    return this.resource(
      'DELETE',
      `/proposals/${id(proposalId)}/taxations/${id(taxationId)}`,
      undefined,
      options,
    );
  }
}
