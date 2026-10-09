import type { RequestOptions } from '../client';
import type { Page } from '../pagination';
import type {
  ID,
  Proposal,
  ProposalCreateParams,
  ProposalListParams,
  ProposalSendParams,
  ProposalSendResult,
  ProposalUpdateParams,
} from '../types';
import { APIResource, commaList, id } from './resource';

export class ProposalsResource extends APIResource {
  /** One page of proposals, newest first. Archived proposals are excluded unless `archived: true`. */
  list(params: ProposalListParams = {}, options?: RequestOptions): Promise<Page<Proposal>> {
    return this.page('/proposals', toQuery(params), options);
  }

  /** Every proposal matching `params`, fetching pages as you iterate. */
  listAll(params: ProposalListParams = {}, options?: RequestOptions): AsyncGenerator<Proposal> {
    return this.all('/proposals', toQuery(params), options);
  }

  get(proposalId: ID, options?: RequestOptions): Promise<Proposal> {
    return this.resource('GET', `/proposals/${id(proposalId)}`, undefined, options);
  }

  /** Creates a proposal, from scratch or from a template with `template_id`. */
  create(params: ProposalCreateParams = {}, options?: RequestOptions): Promise<Proposal> {
    return this.resource('POST', '/proposals', { proposal: params }, options);
  }

  /**
   * Updates a proposal. The status cannot be changed this way: it follows
   * what happens to the proposal (sent, accepted, rejected).
   */
  update(
    proposalId: ID,
    params: ProposalUpdateParams,
    options?: RequestOptions,
  ): Promise<Proposal> {
    return this.resource('PUT', `/proposals/${id(proposalId)}`, { proposal: params }, options);
  }

  /** Deletes the proposal and returns it as it was. */
  delete(proposalId: ID, options?: RequestOptions): Promise<Proposal> {
    return this.resource('DELETE', `/proposals/${id(proposalId)}`, undefined, options);
  }

  archive(proposalId: ID, options?: RequestOptions): Promise<Proposal> {
    return this.resource('PUT', `/proposals/${id(proposalId)}/archive`, undefined, options);
  }

  /**
   * Emails the proposal to one or more recipients.
   *
   * @example
   * ```ts
   * await nusii.proposals.send(123, {
   *   recipients: [{ name: 'Jane Doe', email: 'jane@example.com' }],
   *   subject: 'Your proposal',
   * });
   * ```
   */
  send(
    proposalId: ID,
    params: ProposalSendParams,
    options?: RequestOptions,
  ): Promise<ProposalSendResult> {
    return this.client.request(
      { method: 'PUT', path: `/proposals/${id(proposalId)}/send_proposal`, body: params },
      options,
    );
  }
}

function toQuery({ recipient_emails, ...params }: ProposalListParams) {
  return { ...params, recipient_emails: commaList(recipient_emails) };
}
