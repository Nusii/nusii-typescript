import type { RequestOptions } from '../client';
import type { Account } from '../types';
import { APIResource } from './resource';

export class AccountResource extends APIResource {
  /** The account the API key or access token belongs to. */
  me(options?: RequestOptions): Promise<Account> {
    return this.resource('GET', '/account/me', undefined, options);
  }
}
