import type { RequestOptions } from '../client';
import type { Page } from '../pagination';
import type { ID, PaginationParams, WebhookEndpoint, WebhookEndpointCreateParams } from '../types';
import { APIResource, id } from './resource';

export class WebhookEndpointsResource extends APIResource {
  list(params: PaginationParams = {}, options?: RequestOptions): Promise<Page<WebhookEndpoint>> {
    return this.page('/webhook_endpoints', { ...params }, options);
  }

  /** Every webhook endpoint, fetching pages as you iterate. */
  listAll(
    params: PaginationParams = {},
    options?: RequestOptions,
  ): AsyncGenerator<WebhookEndpoint> {
    return this.all('/webhook_endpoints', { ...params }, options);
  }

  get(endpointId: ID, options?: RequestOptions): Promise<WebhookEndpoint> {
    return this.resource('GET', `/webhook_endpoints/${id(endpointId)}`, undefined, options);
  }

  /**
   * Subscribes a URL to events. Nusii POSTs each event as JSON; parse it with
   * `parseWebhookEvent()`. Answering a delivery with HTTP 410 removes the endpoint.
   */
  create(params: WebhookEndpointCreateParams, options?: RequestOptions): Promise<WebhookEndpoint> {
    return this.resource('POST', '/webhook_endpoints', { webhook_endpoint: params }, options);
  }

  /** Deletes the endpoint and returns it as it was. */
  delete(endpointId: ID, options?: RequestOptions): Promise<WebhookEndpoint> {
    return this.resource('DELETE', `/webhook_endpoints/${id(endpointId)}`, undefined, options);
  }
}
