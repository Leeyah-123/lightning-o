import { Bounty } from '@/types/bounty';
import type { BountyContent, NostrEventBase } from '@/types/nostr';
import { validationUtils } from './validation';

// Nostr event validation utilities
export const nostrValidation = {
  // Validate if an event has the required structure
  isValidEvent: (event: unknown): event is NostrEventBase => {
    if (!event || typeof event !== 'object' || event === null) {
      return false;
    }

    const eventObj = event as Record<string, unknown>;
    return (
      typeof eventObj.id === 'string' &&
      typeof eventObj.pubkey === 'string' &&
      typeof eventObj.created_at === 'number' &&
      typeof eventObj.kind === 'number' &&
      typeof eventObj.content === 'string' &&
      typeof eventObj.sig === 'string' &&
      Array.isArray(eventObj.tags)
    );
  },

  // Validate if event content is valid JSON
  isValidEventContent: (content: string): boolean => {
    try {
      const parsed = JSON.parse(content);
      return typeof parsed === 'object' && parsed !== null;
    } catch {
      return false;
    }
  },

  // Validate bounty content structure
  isValidBountyContent: (content: unknown): content is BountyContent => {
    if (!content || typeof content !== 'object' || content === null) {
      return false;
    }

    const contentObj = content as Record<string, unknown>;

    // Check required fields
    if (
      typeof contentObj.type !== 'string' ||
      typeof contentObj.bountyId !== 'string'
    ) {
      return false;
    }

    // Validate based on content type
    switch (contentObj.type) {
      case 'pending':
      case '':
        return (
          typeof contentObj.title === 'string' &&
          typeof contentObj.shortDescription === 'string' &&
          typeof contentObj.description === 'string' &&
          typeof contentObj.sponsorPubkey === 'string' &&
          (typeof contentObj.rewardSats === 'number' ||
            (Array.isArray(contentObj.rewardSats) &&
              contentObj.rewardSats.every(
                (reward: unknown) => typeof reward === 'number'
              ))) &&
          typeof contentObj.submissionDeadline === 'number' &&
          typeof contentObj.judgingDeadline === 'number' &&
          validationUtils.isValidPubkey(contentObj.sponsorPubkey)
        );

      case 'open':
        return typeof contentObj.escrowTxId === 'string';

      case 'completed':
        return (
          Array.isArray(contentObj.winners) &&
          contentObj.winners.every(
            (winner: unknown) =>
              typeof winner === 'object' &&
              winner !== null &&
              typeof (winner as Record<string, unknown>).pubkey === 'string' &&
              typeof (winner as Record<string, unknown>).amountSats ===
                'number' &&
              typeof (winner as Record<string, unknown>).paymentProof ===
                'string' &&
              validationUtils.isValidPubkey(
                (winner as Record<string, unknown>).pubkey as string
              )
          )
        );

      case 'submit':
        return (
          typeof contentObj.submissionId === 'string' &&
          typeof contentObj.content === 'string' &&
          typeof contentObj.lightningAddress === 'string' &&
          typeof contentObj.submitterPubkey === 'string' &&
          validationUtils.isValidPubkey(contentObj.submitterPubkey) &&
          contentObj.content.trim().length > 0 &&
          contentObj.lightningAddress.trim().length > 0
        );

      default:
        return false;
    }
  },

  // Validate if event is from a specific pubkey
  isFromPubkey: (event: NostrEventBase, pubkey: string): boolean => {
    return event.pubkey === pubkey;
  },

  // Validate if event is recent (within last 24 hours)
  isRecent: (event: NostrEventBase, maxAgeHours: number = 24): boolean => {
    const now = Math.floor(Date.now() / 1000);
    const eventAge = now - event.created_at;
    const maxAge = maxAgeHours * 60 * 60;
    return eventAge <= maxAge;
  },

  // Validate event signature (basic check)
  hasValidSignature: (event: NostrEventBase): boolean => {
    return !!event.sig && event.sig.length === 128; // 64 bytes = 128 hex chars
  },

  // Sanitize event content
  sanitizeEventContent: (content: string): string => {
    try {
      const parsed = JSON.parse(content);
      if (typeof parsed === 'object' && parsed !== null) {
        // Sanitize string fields
        Object.keys(parsed).forEach((key) => {
          if (typeof parsed[key] === 'string') {
            parsed[key] = validationUtils.sanitizeString(parsed[key]);
          }
        });
        return JSON.stringify(parsed);
      }
      return content;
    } catch {
      return content;
    }
  },

  // Check if event should be processed (not from self, not duplicate, etc.)
  shouldProcessEvent: (
    event: NostrEventBase,
    content: BountyContent,
    existingBounties?: Map<string, Bounty>
  ): boolean => {
    // For pending events (bounty creation), only skip if we already have the bounty and its status is pending
    // This prevents duplicate bounty creation
    if (
      content.type === 'pending' &&
      existingBounties?.has(content.bountyId) &&
      existingBounties.get(content.bountyId)?.status === 'pending'
    ) {
      return false;
    }

    // For open and completed events, always process them
    // They represent state changes that should be applied even if we have the bounty
    // This handles cases where events arrive out of order or we need to update existing bounties
    if (content.type === 'open' || content.type === 'completed') {
      return true;
    }

    // For any other event types, process them
    return true;
  },
};

// Event filtering utilities
export const eventFilters = {
  // Filter events by kind
  byKind: (events: NostrEventBase[], kinds: number[]): NostrEventBase[] => {
    return events.filter((event) => kinds.includes(event.kind));
  },

  // Filter events by pubkey
  byPubkey: (events: NostrEventBase[], pubkey: string): NostrEventBase[] => {
    return events.filter((event) => event.pubkey === pubkey);
  },

  // Filter events by time range
  byTimeRange: (
    events: NostrEventBase[],
    startTime: number,
    endTime: number
  ): NostrEventBase[] => {
    return events.filter(
      (event) => event.created_at >= startTime && event.created_at <= endTime
    );
  },

  // Sort events by creation time (newest first)
  byNewest: (events: NostrEventBase[]): NostrEventBase[] => {
    return events.sort((a, b) => b.created_at - a.created_at);
  },
};
