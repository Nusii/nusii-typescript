import type { RequestOptions } from '../client';
import type { Page } from '../pagination';
import type {
  ID,
  Section,
  SectionCreateParams,
  SectionListParams,
  SectionUpdateParams,
} from '../types';
import { APIResource, id } from './resource';

export class SectionsResource extends APIResource {
  /**
   * One page of sections, including their line items. Pass `proposal_id` or
   * `template_id` to list the sections of a document; without either, the
   * account's reusable sections (content library) are listed.
   */
  list(params: SectionListParams = {}, options?: RequestOptions): Promise<Page<Section>> {
    return this.page('/sections', { ...params }, options);
  }

  /** Every section matching `params`, fetching pages as you iterate. */
  listAll(params: SectionListParams = {}, options?: RequestOptions): AsyncGenerator<Section> {
    return this.all('/sections', { ...params }, options);
  }

  get(sectionId: ID, options?: RequestOptions): Promise<Section> {
    return this.resource('GET', `/sections/${id(sectionId)}`, undefined, options);
  }

  /**
   * Creates a section in a proposal (`proposal_id`), a template
   * (`template_id`), or the content library (`reusable: true`).
   */
  create(params: SectionCreateParams, options?: RequestOptions): Promise<Section> {
    return this.resource('POST', '/sections', { section: params }, options);
  }

  /**
   * Copies a reusable section, line items included, into a proposal or template.
   * The copy is not reusable itself unless you pass `reusable: true`.
   *
   * @example
   * ```ts
   * await nusii.sections.copy(reusableSectionId, { proposal_id: 123, position: 2 });
   * ```
   */
  copy(
    reusableSectionId: ID,
    params: SectionCreateParams,
    options?: RequestOptions,
  ): Promise<Section> {
    // The API copies every attribute of the original, `reusable: true` included,
    // and a reusable section is detached from its proposal or template.
    return this.resource(
      'POST',
      '/sections',
      { section_id: reusableSectionId, section: { reusable: false, ...params } },
      options,
    );
  }

  update(sectionId: ID, params: SectionUpdateParams, options?: RequestOptions): Promise<Section> {
    return this.resource('PUT', `/sections/${id(sectionId)}`, { section: params }, options);
  }

  /** Deletes the section and returns it as it was. */
  delete(sectionId: ID, options?: RequestOptions): Promise<Section> {
    return this.resource('DELETE', `/sections/${id(sectionId)}`, undefined, options);
  }
}
