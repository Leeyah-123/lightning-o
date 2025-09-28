import { nostrValidation } from '@/lib/nostrValidation';
import type { Bounty, BountySubmission } from '@/types/bounty';
import type {
  BountyContent,
  BountyContentPending,
  BountyContentSubmit,
  NostrEventBase,
} from '@/types/nostr';
import { v4 as uuidv4 } from 'uuid';
import { lightningService, type Payout } from './lightningService';
import { nostrService, type NostrKeys } from './nostrService';

class BountyService {
  private bounties: Map<string, Bounty> = new Map();
  private systemKeys?: NostrKeys;
  private onChangeCallback?: () => void;

  setSystemKeys(keys: NostrKeys) {
    this.systemKeys = keys;
    nostrService.setSystemKeys(keys);
  }

  setOnChangeCallback(callback: () => void) {
    this.onChangeCallback = callback;
  }

  private notifyChange() {
    if (this.onChangeCallback) {
      this.onChangeCallback();
    }
  }

  list(): Bounty[] {
    return Array.from(this.bounties.values()).sort(
      (a, b) => b.createdAt - a.createdAt
    );
  }

  async create(input: {
    title: string;
    shortDescription: string;
    description: string;
    rewardSats: number | number[];
    submissionDeadline: Date;
    judgingDeadline: Date;
    sponsorKeys: NostrKeys;
  }): Promise<Bounty> {
    const id = uuidv4();
    const bounty: Bounty = {
      id,
      title: input.title,
      shortDescription: input.shortDescription,
      description: input.description,
      sponsorPubkey: input.sponsorKeys.pk,
      rewardSats: input.rewardSats,
      status: 'pending',
      submissionDeadline: input.submissionDeadline.getTime(),
      judgingDeadline: input.judgingDeadline.getTime(),
      submissions: [],
      createdAt: Date.now(),
    };
    this.bounties.set(id, bounty);
    this.notifyChange();

    const content: BountyContent = {
      type: 'pending',
      bountyId: id,
      title: bounty.title,
      shortDescription: bounty.shortDescription,
      description: bounty.description,
      sponsorPubkey: bounty.sponsorPubkey,
      rewardSats: bounty.rewardSats,
      submissionDeadline: bounty.submissionDeadline,
      judgingDeadline: bounty.judgingDeadline,
    };
    const res = await nostrService.publishBountyEvent(
      input.sponsorKeys,
      'bounty:create',
      content
    );
    return bounty;
  }

  async fund(
    bountyId: string,
    sponsorKeys: NostrKeys
  ): Promise<{
    success: boolean;
    lightningInvoice?: string;
    escrowTxId?: string;
    error?: string;
  }> {
    const b = this.bounties.get(bountyId);
    if (!b) throw new Error('Bounty not found');
    if (b.sponsorPubkey !== sponsorKeys.pk)
      throw new Error('Only creator can fund');

    // Calculate total reward amount
    const totalReward = Array.isArray(b.rewardSats)
      ? b.rewardSats.reduce((sum, reward) => sum + reward, 0)
      : b.rewardSats;

    const res = await lightningService.fundEscrow({
      bountyId,
      amountSats: totalReward,
      sponsorPubkey: sponsorKeys.pk,
    });

    if (!res.success) {
      return {
        success: false,
        error: res.error || 'Funding failed',
      };
    }

    return {
      success: true,
      lightningInvoice: res.lightningInvoice,
      escrowTxId: res.escrowTxId,
    };
  }

  async submitToBounty(
    bountyId: string,
    submitterKeys: NostrKeys,
    content: string,
    lightningAddress: string
  ): Promise<void> {
    const bounty = this.bounties.get(bountyId);
    if (!bounty) throw new Error('Bounty not found');
    if (bounty.status !== 'open') throw new Error('Bounty is not open');
    if (Date.now() > bounty.submissionDeadline)
      throw new Error('Submission deadline has passed');

    // Validate Lightning address
    if (!lightningService.validateLightningAddress(lightningAddress)) {
      throw new Error('Invalid Lightning address format');
    }

    const submissionId = uuidv4();
    const submission: BountySubmission = {
      id: submissionId,
      pubkey: submitterKeys.pk,
      content,
      lightningAddress,
      submittedAt: Date.now(),
      status: 'pending',
    };

    // Add submission to local state
    bounty.submissions = bounty.submissions || [];
    bounty.submissions.push(submission);
    this.bounties.set(bountyId, bounty);
    this.notifyChange();

    // Publish submission event to Nostr
    const submissionContent: BountyContentSubmit = {
      type: 'submit',
      bountyId,
      submissionId,
      content,
      lightningAddress,
      submitterPubkey: submitterKeys.pk,
    };

    await nostrService.publishBountyEvent(
      submitterKeys,
      'bounty:submit',
      submissionContent
    );
  }

  async complete(
    bountyId: string,
    sponsorKeys: NostrKeys,
    selectedSubmissionIds: string[]
  ): Promise<void> {
    const b = this.bounties.get(bountyId);
    if (!b) throw new Error('Bounty not found');
    if (b.sponsorPubkey !== sponsorKeys.pk)
      throw new Error('Only creator can select winners');
    if (b.status !== 'open') throw new Error('Bounty is not open');
    if (Date.now() < b.submissionDeadline)
      throw new Error('Submission deadline has not passed yet');
    if (!b.submissions || b.submissions.length === 0)
      throw new Error('No submissions to judge');

    // Get selected submissions
    const selectedSubmissions = b.submissions.filter((sub) =>
      selectedSubmissionIds.includes(sub.id)
    );

    if (selectedSubmissions.length === 0)
      throw new Error('No valid submissions selected');

    // Create winners based on reward tiers
    const rewardTiers = Array.isArray(b.rewardSats)
      ? b.rewardSats
      : [b.rewardSats];
    const winners: Payout[] = selectedSubmissions
      .slice(0, rewardTiers.length)
      .map((sub, index) => ({
        pubkey: sub.pubkey,
        amountSats: rewardTiers[index] || 0,
        rank: index + 1, // 1st place, 2nd place, etc.
        lightningAddress: sub.lightningAddress,
      }));

    const { success, proofs, errors } = await lightningService.releasePayouts(
      bountyId,
      winners
    );

    if (!success) {
      const errorMessage = errors?.length
        ? `Payouts failed: ${errors
            .map((e) => `${e.pubkey}: ${e.error}`)
            .join(', ')}`
        : 'Payouts failed';
      throw new Error(errorMessage);
    }
    if (!this.systemKeys) throw new Error('System keys not set');
    const content: BountyContent = {
      type: 'completed',
      bountyId,
      winners: winners.map((w) => ({
        pubkey: w.pubkey,
        amountSats: w.amountSats,
        paymentProof: proofs.find((p) => p.pubkey === w.pubkey)?.proof || '',
      })),
    };
    await nostrService.publishBountyEvent(
      this.systemKeys,
      'bounty:complete',
      content
    );
  }

  // Load existing events from Nostr relays
  async loadExistingEvents() {
    try {
      const events = await nostrService.queryEvents([
        'bounty:create',
        'bounty:open',
        'bounty:complete',
        'bounty:submit',
      ]);

      // Process events in chronological order
      const sortedEvents = events.sort((a, b) => a.created_at - b.created_at);

      for (const event of sortedEvents) {
        try {
          // Validate event structure
          if (!nostrValidation.isValidEvent(event)) {
            continue;
          }

          // Validate event content
          if (!nostrValidation.isValidEventContent(event.content)) {
            continue;
          }

          const content = JSON.parse(event.content) as BountyContent;

          // Validate bounty content structure
          if (!nostrValidation.isValidBountyContent(content)) {
            continue;
          }

          // Check if we should process this event
          if (
            !nostrValidation.shouldProcessEvent(event, content, this.bounties)
          ) {
            continue;
          }

          this.handleNostrEvent(event, content);
        } catch (error) {
          // Only log meaningful errors
          if (event.content && event.content.trim() !== '') {
            console.warn(
              'Failed to parse existing bounty event:',
              error,
              'Event content:',
              event.content
            );
          }
        }
      }

      console.log(
        `Loaded ${sortedEvents.length} existing events, ${this.bounties.size} bounties in cache`
      );
      // Notify listeners that we've loaded existing events
      this.notifyChange();
    } catch (error) {
      console.warn('Failed to load existing bounty events:', error);
    }
  }

  // Relay watcher hooks simulated via lightningService events
  startWatchers() {
    // Load existing events first
    this.loadExistingEvents();

    // Subscribe to new bounty events from Nostr relays
    nostrService.subscribeKinds(
      ['bounty:create', 'bounty:open', 'bounty:complete', 'bounty:submit'],
      (event) => {
        try {
          // Validate event structure
          if (!nostrValidation.isValidEvent(event)) {
            return;
          }

          // Validate event content
          if (!nostrValidation.isValidEventContent(event.content)) {
            return;
          }

          const content = JSON.parse(event.content) as BountyContent;

          // Validate bounty content structure
          if (!nostrValidation.isValidBountyContent(content)) {
            return;
          }

          // Check if we should process this event
          if (
            !nostrValidation.shouldProcessEvent(event, content, this.bounties)
          ) {
            return;
          }
          this.handleNostrEvent(event, content);
        } catch (error) {
          // Only log meaningful errors
          if (event.content && event.content.trim() !== '') {
            console.warn(
              'Failed to parse bounty event:',
              error,
              'Event content:',
              event.content
            );
          }
        }
      }
    );
    lightningService.on((evt) => {
      if (evt.type === 'funded') {
        const {
          bountyId,
          escrowTxId,
          lightningInvoice,
          amountSats,
          paymentHash,
        } = evt.data;
        const b = this.bounties.get(bountyId);
        if (!b) return;
        if (!this.systemKeys) return;
        // Only system key can mark open
        const content: BountyContent = {
          type: 'open',
          bountyId,
          escrowTxId,
          lightningInvoice,
          amountSats,
          paymentHash,
        };
        nostrService
          .publishBountyEvent(this.systemKeys, 'bounty:open', content)
          .then(() => {
            const updated = { ...b, status: 'open', escrowTxId } as Bounty;
            this.bounties.set(bountyId, updated);
            this.notifyChange();
          });
      } else if (evt.type === 'payouts') {
        const { bountyId, proofs } = evt.data as {
          bountyId: string;
          proofs: Array<{ pubkey: string; proof: string }>;
        };
        const b = this.bounties.get(bountyId);
        if (!b) return;
        // bountyService.complete already publishes completion; ensure local state update
        const winners =
          b.winners ||
          proofs.map((p, index) => ({
            pubkey: p.pubkey,
            amountSats: 0,
            paymentProof: p.proof,
            rank: index + 1, // Assign rank based on order
          }));
        const updated = { ...b, status: 'completed', winners } as Bounty;
        this.bounties.set(bountyId, updated);
        this.notifyChange();
      }
    });
  }

  // Validation of incoming nostr events (extend later with full rules)
  validateIncomingEvent(ev: NostrEventBase): boolean {
    try {
      const content = JSON.parse(ev.content) as BountyContent;
      if (content.type === 'pending' || content.type === '') {
        // must be created by sponsor
        return ev.pubkey === (content as BountyContentPending).sponsorPubkey;
      }
      if (content.type === 'open') {
        // only system key allowed
        return !!this.systemKeys && ev.pubkey === this.systemKeys.pk;
      }
      if (content.type === 'completed') {
        return !!this.systemKeys && ev.pubkey === this.systemKeys.pk;
      }
      return false;
    } catch {
      return false;
    }
  }

  private handleNostrEvent(event: NostrEventBase, content: BountyContent) {
    let hasChanges = false;

    switch (content.type) {
      case 'pending':
        // Handle bounty creation
        const existingBounty = this.bounties.get(content.bountyId);
        if (!existingBounty) {
          // Create new bounty
          const bounty: Bounty = {
            id: content.bountyId,
            title: content.title,
            shortDescription: content.shortDescription,
            description: content.description,
            sponsorPubkey: content.sponsorPubkey,
            rewardSats: content.rewardSats,
            status: 'pending',
            submissionDeadline: content.submissionDeadline,
            judgingDeadline: content.judgingDeadline,
            submissions: [],
            createdAt: event.created_at * 1000, // Convert to milliseconds
          };
          this.bounties.set(content.bountyId, bounty);
          hasChanges = true;
        } else if (existingBounty.title === 'Loading...') {
          // Update placeholder bounty with real data
          console.log(
            'Updating placeholder bounty with create event:',
            content.bountyId
          );
          existingBounty.title = content.title;
          existingBounty.shortDescription = content.shortDescription;
          existingBounty.description = content.description;
          existingBounty.sponsorPubkey = content.sponsorPubkey;
          existingBounty.rewardSats = content.rewardSats;
          existingBounty.submissionDeadline = content.submissionDeadline;
          existingBounty.judgingDeadline = content.judgingDeadline;
          // Only set status to 'pending' if it's not already set to a higher state
          if (
            existingBounty.status === 'pending' ||
            existingBounty.status === 'open' ||
            existingBounty.status === 'completed'
          ) {
            // Keep existing status
          } else {
            existingBounty.status = 'pending';
          }
          this.bounties.set(content.bountyId, existingBounty);
          hasChanges = true;
        }
        break;
      case 'open':
        console.log('open', content);
        // Handle bounty funding
        const openBounty = this.bounties.get(content.bountyId);
        if (openBounty) {
          // Update existing bounty
          openBounty.status = 'open';
          openBounty.escrowTxId = content.escrowTxId;
          this.bounties.set(content.bountyId, openBounty);
          hasChanges = true;
        } else {
          // Bounty doesn't exist yet, create a placeholder bounty
          // This handles the case where 'open' event arrives before 'create' event
          console.log(
            'Creating placeholder bounty for open event:',
            content.bountyId
          );
          const placeholderBounty: Bounty = {
            id: content.bountyId,
            title: 'Loading...',
            shortDescription: 'Bounty details loading...',
            description: 'Bounty details are being loaded from the network.',
            sponsorPubkey: 'unknown',
            rewardSats: 0,
            status: 'open',
            submissionDeadline: 0,
            judgingDeadline: 0,
            escrowTxId: content.escrowTxId,
            submissions: [],
            createdAt: event.created_at * 1000,
          };
          this.bounties.set(content.bountyId, placeholderBounty);
          hasChanges = true;
        }
        break;
      case 'completed':
        // Handle bounty completion
        const completedBounty = this.bounties.get(content.bountyId);
        if (completedBounty) {
          // Update existing bounty
          completedBounty.status = 'completed';
          completedBounty.winners = content.winners.map((winner, index) => ({
            ...winner,
            rank: index + 1, // Assign rank based on order
          }));
          this.bounties.set(content.bountyId, completedBounty);
          hasChanges = true;
        } else {
          // Bounty doesn't exist yet, create a placeholder bounty
          // This handles the case where 'completed' event arrives before other events
          console.log(
            'Creating placeholder bounty for completed event:',
            content.bountyId
          );
          const placeholderBounty: Bounty = {
            id: content.bountyId,
            title: 'Loading...',
            shortDescription: 'Bounty details loading...',
            description: 'Bounty details are being loaded from the network.',
            sponsorPubkey: 'unknown',
            rewardSats: 0,
            status: 'completed',
            submissionDeadline: 0,
            judgingDeadline: 0,
            winners: content.winners.map((winner, index) => ({
              ...winner,
              rank: index + 1, // Assign rank based on order
            })),
            submissions: [],
            createdAt: event.created_at * 1000,
          };
          this.bounties.set(content.bountyId, placeholderBounty);
          hasChanges = true;
        }
        break;
      case 'submit':
        // Handle bounty submission
        const submitContent = content as BountyContentSubmit;
        const submitBounty = this.bounties.get(submitContent.bountyId);
        if (submitBounty) {
          // Check if submission already exists
          const existingSubmission = submitBounty.submissions?.find(
            (sub) => sub.id === submitContent.submissionId
          );

          if (!existingSubmission) {
            // Add new submission
            const submission: BountySubmission = {
              id: submitContent.submissionId,
              pubkey: submitContent.submitterPubkey,
              content: submitContent.content,
              lightningAddress: submitContent.lightningAddress,
              submittedAt: event.created_at * 1000,
              status: 'pending',
            };

            submitBounty.submissions = submitBounty.submissions || [];
            submitBounty.submissions.push(submission);
            this.bounties.set(submitContent.bountyId, submitBounty);
            hasChanges = true;
          }
        }
        break;
    }

    // Notify listeners if there were changes
    if (hasChanges) {
      this.notifyChange();
    }
  }
}

export const bountyService = new BountyService();
