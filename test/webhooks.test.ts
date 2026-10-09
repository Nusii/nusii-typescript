import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  NusiiError,
  parseWebhookEvent,
  WEBHOOK_EVENTS,
  type WebhookEvent,
  type WebhookProposal,
} from '../src';

const payload = {
  event_name: 'proposal_accepted',
  proposal: { id: 1, title: 'Website', status: 'accepted' },
};

describe('parseWebhookEvent', () => {
  it('parses a JSON string', () => {
    expect(parseWebhookEvent(JSON.stringify(payload))).toEqual(payload);
  });

  it('parses bytes', () => {
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    expect(parseWebhookEvent(bytes)).toEqual(payload);
    expect(parseWebhookEvent(bytes.buffer)).toEqual(payload);
  });

  it('accepts an already parsed body', () => {
    expect(parseWebhookEvent(payload)).toBe(payload);
  });

  it('rejects invalid JSON', () => {
    expect(() => parseWebhookEvent('not json')).toThrow(NusiiError);
  });

  it('rejects a body without an event name', () => {
    expect(() => parseWebhookEvent({ proposal: {} })).toThrow(/event_name/);
    expect(() => parseWebhookEvent('null')).toThrow(/event_name/);
  });

  it('narrows the payload by event name', () => {
    const event: WebhookEvent = parseWebhookEvent(payload);
    if (event.event_name === 'proposal_accepted') {
      expectTypeOf(event.proposal).toEqualTypeOf<WebhookProposal>();
    }
    if (event.event_name === 'proposal_activity_client_viewed_proposal') {
      expectTypeOf(event).toHaveProperty('proposal_activity');
    }
    if (event.event_name === 'client_created') {
      expectTypeOf(event).toHaveProperty('client');
    }
  });

  it('lists every event name', () => {
    expect(WEBHOOK_EVENTS).toHaveLength(11);
  });
});
