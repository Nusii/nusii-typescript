import type { RequestOptions } from '../client';
import type {
  IntegrationInstallation,
  LessAnnoyingCrmInstallationParams,
  OnePageCrmInstallationParams,
} from '../types';
import { APIResource } from './resource';

export class IntegrationsResource extends APIResource {
  /** Connects the account to OnePageCRM. */
  createOnePageCrmInstallation(
    params: OnePageCrmInstallationParams,
    options?: RequestOptions,
  ): Promise<IntegrationInstallation> {
    return this.resource(
      'POST',
      '/integrations/one_page_crm_installations',
      { one_page_crm_installation: params },
      options,
    );
  }

  /** Connects the account to Less Annoying CRM. */
  createLessAnnoyingCrmInstallation(
    params: LessAnnoyingCrmInstallationParams,
    options?: RequestOptions,
  ): Promise<IntegrationInstallation> {
    return this.resource(
      'POST',
      '/integrations/less_annoying_crm_installations',
      { less_annoying_crm_installation: params },
      options,
    );
  }
}
