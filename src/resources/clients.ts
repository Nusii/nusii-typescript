import type { RequestOptions } from '../client';
import type { Page } from '../pagination';
import type {
  Client,
  ClientCreateParams,
  ClientListParams,
  ClientUpdateParams,
  ID,
} from '../types';
import { APIResource, commaList, id } from './resource';

export class ClientsResource extends APIResource {
  /** One page of clients, newest first. */
  list(params: ClientListParams = {}, options?: RequestOptions): Promise<Page<Client>> {
    return this.page('/clients', toQuery(params), options);
  }

  /** Every client matching `params`, fetching pages as you iterate. */
  listAll(params: ClientListParams = {}, options?: RequestOptions): AsyncGenerator<Client> {
    return this.all('/clients', toQuery(params), options);
  }

  get(clientId: ID, options?: RequestOptions): Promise<Client> {
    return this.resource('GET', `/clients/${id(clientId)}`, undefined, options);
  }

  create(params: ClientCreateParams, options?: RequestOptions): Promise<Client> {
    return this.resource('POST', '/clients', { client: params }, options);
  }

  update(clientId: ID, params: ClientUpdateParams, options?: RequestOptions): Promise<Client> {
    return this.resource('PUT', `/clients/${id(clientId)}`, { client: params }, options);
  }

  /** Deletes the client and returns it as it was. */
  delete(clientId: ID, options?: RequestOptions): Promise<Client> {
    return this.resource('DELETE', `/clients/${id(clientId)}`, undefined, options);
  }
}

function toQuery({ emails, ...params }: ClientListParams) {
  return { ...params, emails: commaList(emails) };
}
