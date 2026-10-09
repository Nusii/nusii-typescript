// Types for the resources of the Nusii API v2. Attribute names mirror the API
// (snake_case) so they match https://developer.nusii.com one to one.

/** Resource ids are integers, numeric strings are accepted too. */
export type ID = number | string;

/** An ISO 8601 timestamp such as `2026-03-01T09:30:00.000Z`. */
export type Timestamp = string;

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface PaginationMeta {
  current_page: number;
  next_page: number | null;
  prev_page: number | null;
  total_pages: number;
  total_count: number;
}

export interface PaginationParams {
  /** Page number, starting at 1. */
  page?: number;
  /** Items per page (the API default is 25). */
  per_page?: number;
}

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------

export interface Account {
  id: number;
  email: string;
  name: string;
  subdomain: string;
  web: string | null;
  currency: string;
  address: string | null;
  address_state: string | null;
  postcode: string | null;
  city: string | null;
  country: unknown;
  country_name: string | null;
  telephone: string | null;
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export interface Client {
  id: number;
  email: string;
  name: string | null;
  surname: string | null;
  full_name: string;
  business: string | null;
  web: string | null;
  currency: string;
  locale: string | null;
  time_zone: string | null;
  pdf_page_size: string | null;
  notes: string | null;
  client_role: string | null;
  telephone: string | null;
  address: string | null;
  city: string | null;
  postcode: string | null;
  country: string | null;
  state: string | null;
  created_at: Timestamp;
}

export interface ClientUpdateParams {
  name?: string;
  surname?: string | null;
  email?: string;
  business?: string | null;
  telephone?: string | null;
  web?: string | null;
  /** ISO 4217 code, see `nusii.currencies.list()`. */
  currency?: string;
  /** See `nusii.locales.list()`. */
  locale?: string;
  /** See `nusii.pdfPageSizes.list()`. */
  pdf_page_size?: string;
  time_zone?: string | null;
  notes?: string | null;
  client_role?: string | null;
  vat_number?: string | null;
  address?: string | null;
  city?: string | null;
  postcode?: string | null;
  state?: string | null;
  country?: string | null;
}

export interface ClientCreateParams extends ClientUpdateParams {
  name: string;
  email: string;
}

export interface ClientListParams extends PaginationParams {
  /** Full text search over name, surname, business and email. */
  query?: string;
  /** Exact email match. */
  email?: string;
  /** Any of these emails (up to 30). */
  emails?: string | string[];
}

// ---------------------------------------------------------------------------
// Proposals
// ---------------------------------------------------------------------------

export type ProposalStatus = 'draft' | 'pending' | 'accepted' | 'rejected' | 'clarification';

export const PROPOSAL_STATUSES: readonly ProposalStatus[] = [
  'draft',
  'pending',
  'accepted',
  'rejected',
  'clarification',
];

export interface Proposal {
  id: number;
  title: string | null;
  account_id: number;
  status: ProposalStatus;
  public_id: string;
  document_number: string | null;
  prepared_by_id: number | null;
  client_id: number | null;
  sender_id: number | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  sent_at: Timestamp | null;
  signed_at: Timestamp | null;
  accepted_at: Timestamp | null;
  archived_at: Timestamp | null;
  expires_at: Timestamp | null;
  last_viewed_at: Timestamp | null;
  display_date: string | null;
  present_date: string;
  present_email: string;
  document_section_title: string | null;
  force_signature: boolean;
  report: boolean;
  exclude_total: boolean;
  exclude_total_in_pdf: boolean;
  table_of_contents: boolean;
  currency: string;
  theme: string;
  cover_image_url: string | null;
  empty_cover_image: boolean;
  cover_opacity: number;
  cover_overlay_color: string | null;
  cover_overlay_dynamic_color: string | null;
  sender_name: string | null;
  source: string | null;
  accepted_total_in_cents: number | null;
  accepted_total_formatted: string | null;
  payment_percentage: number | null;
  /** Public URL of the proposal PDF. */
  pdf_url: string;
  account_name: string;
  account_web: string | null;
  account_email: string;
  account_telephone: string | null;
  account_address: string | null;
  account_address_state: string | null;
  client_role: string | null;
  client_locale: string | null;
  client_name: string | null;
  client_email: string | null;
  client_surname: string | null;
  client_full_name: string | null;
  client_business: string | null;
  client_telephone: string | null;
  client_address: string | null;
  client_city: string | null;
  client_postcode: string | null;
  client_country: string | null;
  client_state: string | null;
  client_web: string | null;
  client_notes: string | null;
}

export interface ProposalUpdateParams {
  title?: string;
  client_id?: number;
  /** User id of the team member the proposal is prepared by. */
  prepared_by_id?: number | null;
  /** Date (`YYYY-MM-DD`) after which the proposal can no longer be accepted. */
  expires_at?: string | null;
  /** Date shown on the proposal instead of the creation date. */
  display_date?: string | null;
  document_section_title?: string | null;
  /** `'clean'` (Modern) or `'classic'`, see `nusii.themes.list()`. */
  theme?: string;
  report?: boolean;
  exclude_total?: boolean;
  exclude_total_in_pdf?: boolean;
  /** Percentage of the total requested as payment on acceptance. */
  payment_percentage?: number | null;
  archived_at?: string | null;
}

export interface ProposalCreateParams extends ProposalUpdateParams {
  /** Create the proposal from this template, copying its sections and settings. */
  template_id?: number;
  status?: ProposalStatus;
}

export interface ProposalListParams extends PaginationParams {
  status?: ProposalStatus;
  /** Any of these statuses. */
  statuses?: ProposalStatus[];
  /** `true` returns only archived proposals, otherwise only unarchived ones. */
  archived?: boolean;
  /** Search title, document number, public id and client name, business and email. */
  query?: string;
  /** Proposals sent to this recipient. */
  recipient_email?: string;
  /** Proposals sent to any of these recipients (up to 30). */
  recipient_emails?: string | string[];
  /** Only proposals the client has never viewed. */
  no_activity_client_view_proposal?: boolean;
  /** Date filters take `YYYY-MM-DD` and are inclusive of the whole day. */
  created_at_after?: string;
  created_at_before?: string;
  sent_at_after?: string;
  sent_at_before?: string;
  expires_at_after?: string;
  expires_at_before?: string;
  accepted_at_after?: string;
  accepted_at_before?: string;
}

export interface ProposalRecipient {
  name: string;
  email: string;
  /** Whether this recipient can accept and sign. Defaults to `true`. */
  eligible_to_sign?: boolean;
}

export interface ProposalSendParams {
  /** One or more recipients. Use this or `email`. */
  recipients?: ProposalRecipient[];
  /** A single recipient, named after the client. Use this or `recipients`. */
  email?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  /** Email body. Supports basic HTML. */
  message?: string;
  /** Send as this team member (by user id). Defaults to the account owner. */
  sender_id?: number;
  /** Send as this team member (by email). Defaults to the account owner. */
  sender_email?: string;
  /** Save subject and message as the default email template. */
  save_email_template?: boolean;
}

export interface ProposalSendResult {
  status: ProposalStatus;
  sent_at: Timestamp;
  sender_id: number;
  sender_name: string;
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export type SectionType = 'text' | 'cost';

export interface Section {
  id: number;
  account_id: number | null;
  proposal_id: number | null;
  template_id: number | null;
  currency: string;
  title: string | null;
  name: string | null;
  /** HTML content of the section. */
  body: string | null;
  position: number | null;
  reusable: boolean;
  section_type: SectionType;
  page_break: boolean;
  optional: boolean;
  selected: boolean;
  include_total: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
  /** Total of the section without optional line items, in cents. */
  total_in_cents: number;
  total_formatted: string;
  /** High end of the total when the section contains price ranges, otherwise `null`. */
  maximum_total_in_cents: number | null;
  maximum_total_formatted: string | null;
  /** Line items of a cost section. Not present on text sections. */
  line_items?: LineItem[];
}

export interface SectionUpdateParams {
  /** Heading shown on the proposal page. */
  title?: string;
  /** Name shown in the editor navigation. Defaults to `title` when only one is given. */
  name?: string;
  /** HTML content. */
  body?: string;
  section_type?: SectionType;
  position?: number;
  optional?: boolean;
  include_total?: boolean;
  page_break?: boolean;
  /** Save as a reusable section in the content library (not attached to a document). */
  reusable?: boolean;
  proposal_id?: number | null;
  template_id?: number | null;
}

export type SectionCreateParams = SectionUpdateParams;

export interface SectionListParams extends PaginationParams {
  /** Sections of this proposal. */
  proposal_id?: number;
  /** Sections of this template. */
  template_id?: number;
}

// ---------------------------------------------------------------------------
// Line items
// ---------------------------------------------------------------------------

export type CostType = 'fixed' | 'recurring' | 'per' | 'range';

export type RecurringType =
  | 'yearly'
  | 'semiannually'
  | 'trimester'
  | 'monthly'
  | 'quadweekly'
  | 'fortnightly'
  | 'weekly'
  | 'daily'
  | 'hourly';

export type PerType =
  | 'year'
  | 'month'
  | 'week'
  | 'day'
  | 'hour'
  | 'item'
  | 'unit'
  | 'person'
  | 'session'
  | 'team'
  | 'visit'
  | 'square_meter'
  | 'meter'
  | 'song'
  | 'cycle'
  | 'keynote';

/** `checkbox` lets the client pick any number of items, `radio` exactly one. */
export type ChoiceType = 'none' | 'checkbox' | 'radio';

export interface LineItem {
  id: number;
  section_id: number;
  name: string | null;
  position: number | null;
  cost_type: CostType;
  recurring_type: RecurringType | null;
  per_type: PerType | null;
  choice_type: ChoiceType;
  /** Decimal quantity as a string, e.g. `"2.5"`. */
  quantity: string | null;
  currency: string;
  /** Price in cents. For a range, the low end. */
  amount: number;
  amount_in_cents: number;
  amount_formatted: string;
  /** High end of a price range in cents, `null` unless `cost_type` is `range`. */
  maximum_amount_in_cents: number | null;
  maximum_amount_formatted: string | null;
  total_in_cents: number;
  total_formatted: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface LineItemCreateParams {
  name?: string;
  /** Price in cents. For a range, the low end. */
  amount?: number;
  /**
   * High end of a price range in cents, used with `cost_type: 'range'`.
   * Requires the price ranges feature on the account.
   */
  maximum_amount?: number | null;
  cost_type?: CostType;
  recurring_type?: RecurringType | null;
  per_type?: PerType | null;
  choice_type?: ChoiceType;
  quantity?: number | string | null;
  position?: number;
}

export type LineItemUpdateParams = LineItemCreateParams;

// ---------------------------------------------------------------------------
// Taxations
// ---------------------------------------------------------------------------

export interface Taxation {
  id: number;
  name: string;
  /** Decimal percentage as a string, e.g. `"21.0"`. */
  percentage: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface TaxationCreateParams {
  name: string;
  /** Between -100 and 100. Negative values work as a discount. */
  percentage: number | string;
  /** Copy name and percentage from one of the account's saved taxes. */
  tax_id?: number;
}

export type TaxationUpdateParams = Partial<TaxationCreateParams>;

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

/** A template as returned by `templates.list()`. */
export interface TemplateSummary {
  id: number;
  name: string;
  created_at: Timestamp;
  public_template: boolean;
}

/** A template as returned by `templates.get()`. */
export interface Template extends TemplateSummary {
  account_id: number | null;
  dummy_template: boolean;
}

export interface TemplateListParams extends PaginationParams {
  /** List Nusii's public template gallery instead of the account's templates. */
  public_templates?: boolean;
}

// ---------------------------------------------------------------------------
// Proposal activities
// ---------------------------------------------------------------------------

export type ProposalActivityType =
  | 'client_view_proposal'
  | 'client_view_pdf'
  | 'user_create_proposal'
  | 'user_view_proposal'
  | 'user_send_proposal'
  | 'user_manual_change_status_proposal'
  | 'user_unlock_proposal'
  | 'user_signed_proposal'
  | 'user_duplicate_proposal'
  | 'client_rejected_proposal'
  | 'client_clarification_proposal'
  | 'client_accepted_proposal'
  | 'client_paid_proposal'
  | 'client_paid_proposal_error'
  | 'client_paid_invoice'
  | 'client_email_bounced'
  | 'client_email_opened'
  | 'client_email_spam_complaint'
  | 'sample_proposal_view'
  | 'api_created_proposal'
  // Keeps autocompletion for the known values while allowing new ones.
  | (string & {});

export interface ProposalActivity {
  id: number;
  activity_type: ProposalActivityType;
  ip_address: string | null;
  /** Extra details such as email `to`, `cc`, `subject` or bounce information. */
  additional_fields: Record<string, unknown> | null;
  proposal_title: string | null;
  proposal_created_at: Timestamp | null;
  proposal_sent_at: Timestamp | null;
  proposal_status: ProposalStatus | null;
  proposal_public_id: string | null;
  proposal_expires_at: Timestamp | null;
  client_name: string | null;
  client_email: string | null;
  client_surname: string | null;
  client_full_name: string | null;
  client_business: string | null;
  client_telephone: string | null;
  client_locale: string | null;
  client_address: string | null;
  client_postcode: string | null;
  client_country: string | null;
  client_city: string | null;
  client_state: string | null;
  client_web: string | null;
}

export interface ProposalActivityListParams extends PaginationParams {
  /** Activities of this proposal. */
  proposal_id?: number;
  /** Activities of all proposals of this client. */
  client_id?: number;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export interface User {
  id: number;
  email: string;
  name: string | null;
}

// ---------------------------------------------------------------------------
// Webhook endpoints
// ---------------------------------------------------------------------------

export type WebhookEventName =
  | 'proposal_created'
  | 'proposal_updated'
  | 'proposal_destroyed'
  | 'proposal_accepted'
  | 'proposal_rejected'
  | 'proposal_sent'
  | 'client_created'
  | 'client_updated'
  | 'client_destroyed'
  | 'proposal_activity_client_viewed'
  | 'proposal_activity_client_viewed_proposal';

export const WEBHOOK_EVENTS: readonly WebhookEventName[] = [
  'proposal_created',
  'proposal_updated',
  'proposal_destroyed',
  'proposal_accepted',
  'proposal_rejected',
  'proposal_sent',
  'client_created',
  'client_updated',
  'client_destroyed',
  'proposal_activity_client_viewed',
  'proposal_activity_client_viewed_proposal',
];

export interface WebhookEndpoint {
  id: number;
  target_url: string;
  events: WebhookEventName[];
}

export interface WebhookEndpointCreateParams {
  /** URL Nusii POSTs the event JSON to. */
  target_url: string;
  events: WebhookEventName[];
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

export interface Theme {
  /** Value to use for a proposal's `theme`, e.g. `'clean'`. */
  id: string;
  name: string;
}

export interface Currency {
  id: string;
  iso_code: string;
  name: string;
}

export interface Locale {
  id: string;
  code: string;
  name: string;
}

export interface PdfPageSize {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Integrations
// ---------------------------------------------------------------------------

export interface IntegrationInstallation {
  id: number;
  name: string;
}

export interface OnePageCrmInstallationParams {
  name?: string;
  api_key: string;
  api_secret: string;
}

export interface LessAnnoyingCrmInstallationParams {
  name?: string;
  token: string;
  user_code: string;
  user_id?: string | number;
}
