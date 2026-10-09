// Payloads Nusii POSTs to webhook endpoints. Each event carries the affected
// record under its own key plus the `event_name`:
//   { "event_name": "proposal_accepted", "proposal": { "id": 1, ... } }

import { NusiiError } from './errors';
import type {
  Client,
  ProposalActivityType,
  ProposalStatus,
  Timestamp,
  WebhookEventName,
} from './types';

export interface WebhookProposal {
  id: number;
  title: string | null;
  status: ProposalStatus;
  public_id: string;
  /** Link the client opens to view the proposal. */
  public_url: string | null;
  document_number: string | null;
  prepared_by_id: number | null;
  prepared_by_name: string | null;
  client_id: number | null;
  sender_id: number | null;
  sender_name: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  sent_at: Timestamp | null;
  accepted_at: Timestamp | null;
  expires_at: Timestamp | null;
  report: boolean;
  currency: string;
  payment_percentage: number | null;
  paid_amount_formatted: string | null;
  paid_at: Timestamp | null;
  total_formatted: string;
  accepted_total_in_cents: number | null;
  accepted_total_formatted: string | null;
  account_name: string;
  account_web: string | null;
  account_email: string;
  account_telephone: string | null;
  account_address: string | null;
  account_address_state: string | null;
  client_role: string | null;
  client_name: string | null;
  client_email: string | null;
  client_surname: string | null;
  client_full_name: string | null;
  client_business: string | null;
  client_telephone: string | null;
  client_locale: string | null;
  client_address: string | null;
  client_city: string | null;
  client_postcode: string | null;
  client_country: string | null;
  client_state: string | null;
  client_web: string | null;
  client_notes: string | null;
}

export interface WebhookProposalActivity {
  id: number;
  activity_type: ProposalActivityType;
  ip_address: string | null;
  viewed_at: Timestamp;
  /** Link to the proposal in the Nusii app. */
  proposal_link: string | null;
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

export interface ProposalWebhookEvent {
  event_name: Extract<WebhookEventName, `proposal_${string}`> &
    Exclude<WebhookEventName, `proposal_activity_${string}`>;
  proposal: WebhookProposal;
}

export interface ClientWebhookEvent {
  event_name: Extract<WebhookEventName, `client_${string}`>;
  client: Client;
}

export interface ProposalActivityWebhookEvent {
  event_name: Extract<WebhookEventName, `proposal_activity_${string}`>;
  proposal_activity: WebhookProposalActivity;
}

/** Any event Nusii delivers. Narrow it with `event.event_name`. */
export type WebhookEvent = ProposalWebhookEvent | ClientWebhookEvent | ProposalActivityWebhookEvent;

/**
 * Parses the body of a webhook delivery.
 *
 * Nusii does not sign webhook deliveries, so treat the endpoint URL as a
 * secret (e.g. include a long random token in its path) and fetch the record
 * from the API when you need to be certain of its current state.
 *
 * @example
 * ```ts
 * const event = parseWebhookEvent(await request.text());
 * if (event.event_name === 'proposal_accepted') {
 *   console.log(event.proposal.title);
 * }
 * ```
 */
export function parseWebhookEvent(
  payload: string | Uint8Array | ArrayBuffer | object,
): WebhookEvent {
  let data: unknown = payload;
  if (payload instanceof ArrayBuffer || payload instanceof Uint8Array) {
    data = new TextDecoder().decode(payload);
  }
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      throw new NusiiError('Invalid webhook payload: the body is not valid JSON');
    }
  }
  if (
    typeof data !== 'object' ||
    data === null ||
    typeof (data as { event_name?: unknown }).event_name !== 'string'
  ) {
    throw new NusiiError('Invalid webhook payload: missing `event_name`');
  }
  return data as WebhookEvent;
}
