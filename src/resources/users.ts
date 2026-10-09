import type { RequestOptions } from '../client';
import type { Page } from '../pagination';
import type { PaginationParams, User } from '../types';
import { APIResource } from './resource';

export class UsersResource extends APIResource {
  /** One page of the account's team members. */
  list(params: PaginationParams = {}, options?: RequestOptions): Promise<Page<User>> {
    return this.page('/users', { ...params }, options);
  }

  /** Every team member, fetching pages as you iterate. */
  listAll(params: PaginationParams = {}, options?: RequestOptions): AsyncGenerator<User> {
    return this.all('/users', { ...params }, options);
  }
}
