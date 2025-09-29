import type { Bounty, BountySubmission } from '@/types/bounty';
import type { BountyContent, NostrEventBase } from '@/types/nostr';

/**
 * Helper functions for bounty event processing
 */
export class BountyEventHelpers {
  /**
   * Safely find a bounty by ID
   */
  static findBounty(
    bounties: Map<string, Bounty>,
    bountyId: string
  ): Bounty | null {
    try {
      return bounties.get(bountyId) || null;
    } catch (error) {
      console.warn(`Failed to find bounty ${bountyId}:`, error);
      return null;
    }
  }

  /**
   * Safely find a submission within a bounty
   */
  static findSubmission(
    bounty: Bounty,
    submissionId: string
  ): BountySubmission | null {
    try {
      return bounty.submissions?.find((sub) => sub.id === submissionId) || null;
    } catch (error) {
      console.warn(
        `Failed to find submission ${submissionId} in bounty ${bounty.id}:`,
        error
      );
      return null;
    }
  }

  /**
   * Update bounty and save to map
   */
  static updateBounty(bounties: Map<string, Bounty>, bounty: Bounty): boolean {
    try {
      bounties.set(bounty.id, bounty);
      return true;
    } catch (error) {
      console.error(`Failed to update bounty ${bounty.id}:`, error);
      return false;
    }
  }

  /**
   * Validate event content before processing
   */
  static validateEventContent(
    content: BountyContent,
    event: NostrEventBase
  ): boolean {
    if (!content || typeof content !== 'object') {
      console.warn('Invalid content type:', typeof content);
      return false;
    }

    if (!content.type) {
      console.warn('Missing content type in event:', event.id);
      return false;
    }

    if (!content.bountyId) {
      console.warn('Missing bountyId in event:', event.id);
      return false;
    }

    return true;
  }

  /**
   * Convert Nostr timestamp to milliseconds
   */
  static toMilliseconds(timestamp: number): number {
    return timestamp * 1000;
  }
}

/**
 * Individual event handlers for bounty events
 */
export class BountyEventHandlers {
  constructor(private bounties: Map<string, Bounty>) {}

  /**
   * Handle bounty creation event
   */
  handlePending(event: NostrEventBase, content: BountyContent): boolean {
    if (!BountyEventHelpers.validateEventContent(content, event)) {
      return false;
    }

    if (content.type !== 'pending') {
      console.warn(`Expected 'pending' event type, got: ${content.type}`);
      return false;
    }

    const pendingContent = content as {
      bountyId: string;
      sponsorPubkey: string;
      rewardSats: number | number[];
      description: string;
      title: string;
      shortDescription: string;
      submissionDeadline: number;
      judgingDeadline: number;
    };
    const bounty = BountyEventHelpers.findBounty(
      this.bounties,
      pendingContent.bountyId
    );

    if (!bounty) {
      // Create new bounty
      const newBounty: Bounty = {
        id: pendingContent.bountyId,
        title: pendingContent.title,
        shortDescription: pendingContent.shortDescription,
        description: pendingContent.description,
        sponsorPubkey: pendingContent.sponsorPubkey,
        rewardSats: pendingContent.rewardSats,
        status: 'pending',
        submissionDeadline: pendingContent.submissionDeadline,
        judgingDeadline: pendingContent.judgingDeadline,
        submissions: [],
        createdAt: BountyEventHelpers.toMilliseconds(event.created_at),
      };

      this.bounties.set(pendingContent.bountyId, newBounty);
      console.log(`Created bounty ${pendingContent.bountyId}`);
      return true;
    } else if (bounty.title === 'Loading...') {
      // Update placeholder bounty with real data
      console.log(
        `Updating placeholder bounty with create event: ${pendingContent.bountyId}`
      );
      bounty.title = pendingContent.title;
      bounty.shortDescription = pendingContent.shortDescription;
      bounty.description = pendingContent.description;
      bounty.sponsorPubkey = pendingContent.sponsorPubkey;
      bounty.rewardSats = pendingContent.rewardSats;
      bounty.submissionDeadline = pendingContent.submissionDeadline;
      bounty.judgingDeadline = pendingContent.judgingDeadline;

      // Only set status to 'pending' if it's not already set to a higher state
      if (
        bounty.status === 'pending' ||
        bounty.status === 'open' ||
        bounty.status === 'completed'
      ) {
        // Keep existing status
      } else {
        bounty.status = 'pending';
      }

      BountyEventHelpers.updateBounty(this.bounties, bounty);
      return true;
    }

    return false;
  }

  /**
   * Handle bounty funding event
   */
  handleOpen(event: NostrEventBase, content: BountyContent): boolean {
    if (!BountyEventHelpers.validateEventContent(content, event)) {
      return false;
    }

    if (content.type !== 'open') {
      console.warn(`Expected 'open' event type, got: ${content.type}`);
      return false;
    }

    const openContent = content as { bountyId: string; escrowTxId: string };
    const bounty = BountyEventHelpers.findBounty(
      this.bounties,
      openContent.bountyId
    );

    if (bounty) {
      // Update existing bounty
      bounty.status = 'open';
      bounty.escrowTxId = openContent.escrowTxId;
      BountyEventHelpers.updateBounty(this.bounties, bounty);
      console.log(`Opened bounty ${openContent.bountyId}`);
      return true;
    } else {
      // Create placeholder bounty for open event
      console.log(
        `Creating placeholder bounty for open event: ${openContent.bountyId}`
      );
      const placeholderBounty: Bounty = {
        id: openContent.bountyId,
        title: 'Loading...',
        shortDescription: 'Bounty details loading...',
        description: 'Bounty details are being loaded from the network.',
        sponsorPubkey: 'unknown',
        rewardSats: 0,
        status: 'open',
        submissionDeadline: 0,
        judgingDeadline: 0,
        escrowTxId: openContent.escrowTxId,
        submissions: [],
        createdAt: BountyEventHelpers.toMilliseconds(event.created_at),
      };

      this.bounties.set(openContent.bountyId, placeholderBounty);
      console.log(
        `Created placeholder bounty for open event: ${openContent.bountyId}`
      );
      return true;
    }
  }

  /**
   * Handle bounty completion event
   */
  handleCompleted(event: NostrEventBase, content: BountyContent): boolean {
    if (!BountyEventHelpers.validateEventContent(content, event)) {
      return false;
    }

    if (content.type !== 'completed') {
      console.warn(`Expected 'completed' event type, got: ${content.type}`);
      return false;
    }

    const completedContent = content as {
      bountyId: string;
      winners: { pubkey: string; amountSats: number; paymentProof: string }[];
    };
    const bounty = BountyEventHelpers.findBounty(
      this.bounties,
      completedContent.bountyId
    );

    if (bounty) {
      // Update existing bounty
      bounty.status = 'completed';
      bounty.winners = completedContent.winners.map(
        (
          winner: { pubkey: string; amountSats: number; paymentProof: string },
          index: number
        ) => ({
          ...winner,
          rank: index + 1, // Assign rank based on order
        })
      );
      BountyEventHelpers.updateBounty(this.bounties, bounty);
      console.log(`Completed bounty ${completedContent.bountyId}`);
      return true;
    } else {
      // Create placeholder bounty for completed event
      console.log(
        `Creating placeholder bounty for completed event: ${completedContent.bountyId}`
      );
      const placeholderBounty: Bounty = {
        id: completedContent.bountyId,
        title: 'Loading...',
        shortDescription: 'Bounty details loading...',
        description: 'Bounty details are being loaded from the network.',
        sponsorPubkey: 'unknown',
        rewardSats: 0,
        status: 'completed',
        submissionDeadline: 0,
        judgingDeadline: 0,
        winners: completedContent.winners.map(
          (
            winner: {
              pubkey: string;
              amountSats: number;
              paymentProof: string;
            },
            index: number
          ) => ({
            ...winner,
            rank: index + 1, // Assign rank based on order
          })
        ),
        submissions: [],
        createdAt: BountyEventHelpers.toMilliseconds(event.created_at),
      };

      this.bounties.set(completedContent.bountyId, placeholderBounty);
      console.log(
        `Created placeholder bounty for completed event: ${completedContent.bountyId}`
      );
      return true;
    }
  }

  /**
   * Handle bounty submission event
   */
  handleSubmit(event: NostrEventBase, content: BountyContent): boolean {
    if (!BountyEventHelpers.validateEventContent(content, event)) {
      return false;
    }

    if (content.type !== 'submit') {
      console.warn(`Expected 'submit' event type, got: ${content.type}`);
      return false;
    }

    const submitContent = content as {
      bountyId: string;
      submissionId: string;
      content: string;
      lightningAddress: string;
      submitterPubkey: string;
    };
    const bounty = BountyEventHelpers.findBounty(
      this.bounties,
      submitContent.bountyId
    );
    if (!bounty) {
      console.warn(
        `Cannot submit to non-existent bounty: ${submitContent.bountyId}`
      );
      return false;
    }

    // Check if submission already exists
    const existingSubmission = BountyEventHelpers.findSubmission(
      bounty,
      submitContent.submissionId
    );

    if (existingSubmission) {
      console.log(
        `Submission ${submitContent.submissionId} already exists for bounty ${submitContent.bountyId}`
      );
      return false;
    }

    try {
      // Add new submission
      const submission: BountySubmission = {
        id: submitContent.submissionId,
        pubkey: submitContent.submitterPubkey,
        content: submitContent.content,
        lightningAddress: submitContent.lightningAddress,
        submittedAt: BountyEventHelpers.toMilliseconds(event.created_at),
        status: 'pending',
      };

      bounty.submissions = bounty.submissions || [];
      bounty.submissions.push(submission);
      BountyEventHelpers.updateBounty(this.bounties, bounty);
      console.log(
        `Added submission ${submitContent.submissionId} to bounty ${submitContent.bountyId}`
      );
      return true;
    } catch (error) {
      console.error(
        `Failed to add submission to bounty ${submitContent.bountyId}:`,
        error
      );
      return false;
    }
  }
}

/**
 * Event router for bounty events
 */
export class BountyEventRouter {
  private handlers: BountyEventHandlers;

  constructor(bounties: Map<string, Bounty>) {
    this.handlers = new BountyEventHandlers(bounties);
  }

  /**
   * Route event to appropriate handler
   */
  route(event: NostrEventBase, content: BountyContent): boolean {
    try {
      switch (content.type) {
        case 'pending':
          return this.handlers.handlePending(event, content);
        case 'open':
          return this.handlers.handleOpen(event, content);
        case 'completed':
          return this.handlers.handleCompleted(event, content);
        case 'submit':
          return this.handlers.handleSubmit(event, content);
        default:
          console.warn(`Unknown bounty event type: ${content.type}`);
          return false;
      }
    } catch (error) {
      console.error(`Failed to route bounty event ${event.id}:`, error);
      return false;
    }
  }
}
