import type { RequestOptions } from '../client';
import type { Page } from '../pagination';
import type { ID, ProposalActivity, ProposalActivityListParams } from '../types';
import { APIResource, id } from './resource';

export class ProposalActivitiesResource extends APIResource {
  /** One page of activities (views, sends, acceptances...), newest first. */
  list(
    params: ProposalActivityListParams = {},
    options?: RequestOptions,
  ): Promise<Page<ProposalActivity>> {
    return this.page('/proposal_activities', { ...params }, options);
  }

  /** Every activity matching `params`, fetching pages as you iterate. */
  listAll(
    params: ProposalActivityListParams = {},
    options?: RequestOptions,
  ): AsyncGenerator<ProposalActivity> {
    return this.all('/proposal_activities', { ...params }, options);
  }

  get(activityId: ID, options?: RequestOptions): Promise<ProposalActivity> {
    return this.resource('GET', `/proposal_activities/${id(activityId)}`, undefined, options);
  }
}
