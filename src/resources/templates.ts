import type { RequestOptions } from '../client';
import type { Page } from '../pagination';
import type { ID, Template, TemplateListParams, TemplateSummary } from '../types';
import { APIResource, id } from './resource';

export class TemplatesResource extends APIResource {
  /** One page of the account's templates, or of the public gallery with `public_templates: true`. */
  list(params: TemplateListParams = {}, options?: RequestOptions): Promise<Page<TemplateSummary>> {
    return this.page('/templates', { ...params }, options);
  }

  /** Every template matching `params`, fetching pages as you iterate. */
  listAll(
    params: TemplateListParams = {},
    options?: RequestOptions,
  ): AsyncGenerator<TemplateSummary> {
    return this.all('/templates', { ...params }, options);
  }

  get(templateId: ID, options?: RequestOptions): Promise<Template> {
    return this.resource('GET', `/templates/${id(templateId)}`, undefined, options);
  }
}
