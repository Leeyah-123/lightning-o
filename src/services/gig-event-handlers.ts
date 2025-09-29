import type { Gig, GigApplication, GigMilestone } from '@/types/gig';
import type { GigContent, NostrEventBase } from '@/types/nostr';

/**
 * Helper functions for gig event processing
 */
export class GigEventHelpers {
  /**
   * Safely find a gig by ID with error handling
   */
  static findGig(gigs: Map<string, Gig>, gigId: string): Gig | null {
    try {
      return gigs.get(gigId) || null;
    } catch (error) {
      console.warn(`Failed to find gig ${gigId}:`, error);
      return null;
    }
  }

  /**
   * Safely find an application within a gig
   */
  static findApplication(
    gig: Gig,
    applicationId: string
  ): GigApplication | null {
    try {
      return gig.applications.find((app) => app.id === applicationId) || null;
    } catch (error) {
      console.warn(
        `Failed to find application ${applicationId} in gig ${gig.id}:`,
        error
      );
      return null;
    }
  }

  /**
   * Safely find a milestone within an application
   */
  static findMilestone(
    application: GigApplication,
    milestoneId: string
  ): GigMilestone | null {
    try {
      return application.milestones.find((m) => m.id === milestoneId) || null;
    } catch (error) {
      console.warn(
        `Failed to find milestone ${milestoneId} in application ${application.id}:`,
        error
      );
      return null;
    }
  }

  /**
   * Update gig timestamp and save to map
   */
  static updateGig(
    gigs: Map<string, Gig>,
    gig: Gig,
    timestamp: number
  ): boolean {
    try {
      gig.updatedAt = timestamp;
      gigs.set(gig.id, gig);
      return true;
    } catch (error) {
      console.error(`Failed to update gig ${gig.id}:`, error);
      return false;
    }
  }

  /**
   * Validate event content before processing
   */
  static validateEventContent(
    content: GigContent,
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

    return true;
  }

  /**
   * Convert Unix timestamp to milliseconds
   */
  static toMilliseconds(unixTimestamp: number): number {
    return unixTimestamp * 1000;
  }
}

/**
 * Individual event handlers for each gig event type
 */
export class GigEventHandlers {
  constructor(private gigs: Map<string, Gig>) {}

  /**
   * Handle gig creation events
   */
  handleCreate(event: NostrEventBase, content: GigContent): boolean {
    if (content.type !== 'create') return false;

    const existingGig = GigEventHelpers.findGig(this.gigs, content.gigId);
    if (existingGig) {
      console.log(`Gig ${content.gigId} already exists, skipping create event`);
      return false;
    }

    try {
      const gig: Gig = {
        id: content.gigId,
        title: content.title,
        shortDescription: content.shortDescription,
        description: content.description,
        sponsorPubkey: content.sponsorPubkey,
        budgetRange: content.budgetRange,
        status: 'open',
        applications: [],
        createdAt: GigEventHelpers.toMilliseconds(event.created_at),
        updatedAt: GigEventHelpers.toMilliseconds(event.created_at),
      };

      this.gigs.set(content.gigId, gig);
      console.log(`Created new gig: ${content.gigId}`);
      return true;
    } catch (error) {
      console.error(`Failed to create gig ${content.gigId}:`, error);
      return false;
    }
  }

  /**
   * Handle gig application events
   */
  handleApply(event: NostrEventBase, content: GigContent): boolean {
    if (content.type !== 'apply') return false;

    const gig = GigEventHelpers.findGig(this.gigs, content.gigId);
    if (!gig) {
      console.warn(`Cannot apply to non-existent gig: ${content.gigId}`);
      return false;
    }

    // Check if application already exists
    const existingApplication = GigEventHelpers.findApplication(
      gig,
      content.applicationId
    );
    if (existingApplication) {
      console.log(
        `Application ${content.applicationId} already exists for gig ${content.gigId}`
      );
      return false;
    }

    try {
      const milestones: GigMilestone[] = content.milestones.map(
        (m: {
          id: string;
          amountSats: number;
          description: string;
          eta: number;
        }) => ({
          id: m.id,
          amountSats: m.amountSats,
          description: m.description,
          eta: m.eta,
          status: 'pending',
        })
      );

      const application: GigApplication = {
        id: content.applicationId,
        gigId: content.gigId,
        applicantPubkey: content.applicantPubkey,
        portfolioLink: content.portfolioLink,
        offerAmountSats: content.offerAmountSats,
        milestones,
        submittedAt: GigEventHelpers.toMilliseconds(event.created_at),
        status: 'pending',
      };

      gig.applications.push(application);
      GigEventHelpers.updateGig(
        this.gigs,
        gig,
        GigEventHelpers.toMilliseconds(event.created_at)
      );
      console.log(
        `Added application ${content.applicationId} to gig ${content.gigId}`
      );
      return true;
    } catch (error) {
      console.error(
        `Failed to add application to gig ${content.gigId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Handle application selection events
   */
  handleSelect(event: NostrEventBase, content: GigContent): boolean {
    if (content.type !== 'select') return false;

    const gig = GigEventHelpers.findGig(this.gigs, content.gigId);
    if (!gig) {
      console.warn(
        `Cannot select application for non-existent gig: ${content.gigId}`
      );
      return false;
    }

    // Verify the application exists
    const application = GigEventHelpers.findApplication(
      gig,
      content.applicationId
    );
    if (!application) {
      console.warn(
        `Cannot select non-existent application ${content.applicationId} for gig ${content.gigId}`
      );
      return false;
    }

    try {
      gig.selectedApplicationId = content.applicationId;
      gig.status = 'application_selected';
      GigEventHelpers.updateGig(
        this.gigs,
        gig,
        GigEventHelpers.toMilliseconds(event.created_at)
      );
      console.log(
        `Selected application ${content.applicationId} for gig ${content.gigId}`
      );
      return true;
    } catch (error) {
      console.error(
        `Failed to select application for gig ${content.gigId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Handle milestone funding events
   */
  handleFunded(event: NostrEventBase, content: GigContent): boolean {
    if (content.type !== 'funded') return false;

    const gig = GigEventHelpers.findGig(this.gigs, content.gigId);
    if (!gig || !gig.selectedApplicationId) {
      console.warn(
        `Cannot fund milestone for gig ${content.gigId} - no selected application`
      );
      return false;
    }

    const application = GigEventHelpers.findApplication(
      gig,
      gig.selectedApplicationId
    );
    if (!application) {
      console.warn(
        `Cannot fund milestone - selected application not found for gig ${content.gigId}`
      );
      return false;
    }

    const milestone = GigEventHelpers.findMilestone(
      application,
      content.milestoneId
    );
    if (!milestone) {
      console.warn(
        `Cannot fund milestone ${content.milestoneId} - milestone not found`
      );
      return false;
    }

    try {
      milestone.status = 'funded';
      gig.status = 'in_progress';
      GigEventHelpers.updateGig(
        this.gigs,
        gig,
        GigEventHelpers.toMilliseconds(event.created_at)
      );
      console.log(
        `Funded milestone ${content.milestoneId} for gig ${content.gigId}`
      );
      return true;
    } catch (error) {
      console.error(
        `Failed to fund milestone for gig ${content.gigId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Handle milestone submission events
   */
  handleSubmitMilestone(event: NostrEventBase, content: GigContent): boolean {
    if (content.type !== 'submit_milestone') return false;

    const gig = GigEventHelpers.findGig(this.gigs, content.gigId);
    if (!gig || !gig.selectedApplicationId) {
      console.warn(
        `Cannot submit milestone for gig ${content.gigId} - no selected application`
      );
      return false;
    }

    const application = GigEventHelpers.findApplication(
      gig,
      gig.selectedApplicationId
    );
    if (!application) {
      console.warn(
        `Cannot submit milestone - selected application not found for gig ${content.gigId}`
      );
      return false;
    }

    const milestone = GigEventHelpers.findMilestone(
      application,
      content.milestoneId
    );
    if (!milestone) {
      console.warn(
        `Cannot submit milestone ${content.milestoneId} - milestone not found`
      );
      return false;
    }

    try {
      milestone.status = 'submitted';
      milestone.submittedAt = GigEventHelpers.toMilliseconds(event.created_at);
      milestone.submittedContent = content.content;
      milestone.submittedLightningAddress = content.lightningAddress;
      GigEventHelpers.updateGig(
        this.gigs,
        gig,
        GigEventHelpers.toMilliseconds(event.created_at)
      );
      console.log(
        `Submitted milestone ${content.milestoneId} for gig ${content.gigId}`
      );
      return true;
    } catch (error) {
      console.error(
        `Failed to submit milestone for gig ${content.gigId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Handle milestone approval events
   */
  handleApproveMilestone(event: NostrEventBase, content: GigContent): boolean {
    if (content.type !== 'approve_milestone') return false;

    const gig = GigEventHelpers.findGig(this.gigs, content.gigId);
    if (!gig || !gig.selectedApplicationId) {
      console.warn(
        `Cannot approve milestone for gig ${content.gigId} - no selected application`
      );
      return false;
    }

    const application = GigEventHelpers.findApplication(
      gig,
      gig.selectedApplicationId
    );
    if (!application) {
      console.warn(
        `Cannot approve milestone - selected application not found for gig ${content.gigId}`
      );
      return false;
    }

    const milestone = GigEventHelpers.findMilestone(
      application,
      content.milestoneId
    );
    if (!milestone) {
      console.warn(
        `Cannot approve milestone ${content.milestoneId} - milestone not found`
      );
      return false;
    }

    try {
      milestone.status = 'accepted';

      // Find the next milestone and make it pending for funding
      const currentMilestoneIndex = application.milestones.findIndex(
        (m) => m.id === content.milestoneId
      );
      const nextMilestone = application.milestones[currentMilestoneIndex + 1];

      if (nextMilestone) {
        nextMilestone.status = 'pending';
        console.log(
          `Made next milestone ${nextMilestone.id} pending for funding`
        );
      } else {
        // No more milestones, check if all are completed
        const allCompleted = application.milestones.every(
          (m) => m.status === 'accepted'
        );
        if (allCompleted) {
          gig.status = 'completed';
          console.log(
            'All milestones completed, gig status updated to completed'
          );
        }
      }

      GigEventHelpers.updateGig(
        this.gigs,
        gig,
        GigEventHelpers.toMilliseconds(event.created_at)
      );
      console.log(
        `Approved milestone ${content.milestoneId} for gig ${content.gigId}`
      );
      return true;
    } catch (error) {
      console.error(
        `Failed to approve milestone for gig ${content.gigId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Handle milestone rejection events
   */
  handleRejectMilestone(event: NostrEventBase, content: GigContent): boolean {
    if (content.type !== 'reject_milestone') return false;

    const gig = GigEventHelpers.findGig(this.gigs, content.gigId);
    if (!gig || !gig.selectedApplicationId) {
      console.warn(
        `Cannot reject milestone for gig ${content.gigId} - no selected application`
      );
      return false;
    }

    const application = GigEventHelpers.findApplication(
      gig,
      gig.selectedApplicationId
    );
    if (!application) {
      console.warn(
        `Cannot reject milestone - selected application not found for gig ${content.gigId}`
      );
      return false;
    }

    const milestone = GigEventHelpers.findMilestone(
      application,
      content.milestoneId
    );
    if (!milestone) {
      console.warn(
        `Cannot reject milestone ${content.milestoneId} - milestone not found`
      );
      return false;
    }

    try {
      milestone.status = 'rejected';
      milestone.rejectionReason = content.rejectionReason;
      GigEventHelpers.updateGig(
        this.gigs,
        gig,
        GigEventHelpers.toMilliseconds(event.created_at)
      );
      console.log(
        `Rejected milestone ${content.milestoneId} for gig ${content.gigId}`
      );
      return true;
    } catch (error) {
      console.error(
        `Failed to reject milestone for gig ${content.gigId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Handle gig completion events
   */
  handleComplete(event: NostrEventBase, content: GigContent): boolean {
    if (content.type !== 'complete') return false;

    const gig = GigEventHelpers.findGig(this.gigs, content.gigId);
    if (!gig) {
      console.warn(`Cannot complete non-existent gig: ${content.gigId}`);
      return false;
    }

    try {
      gig.status = 'completed';
      GigEventHelpers.updateGig(
        this.gigs,
        gig,
        GigEventHelpers.toMilliseconds(event.created_at)
      );
      console.log(`Completed gig ${content.gigId}`);
      return true;
    } catch (error) {
      console.error(`Failed to complete gig ${content.gigId}:`, error);
      return false;
    }
  }

  /**
   * Handle gig cancellation events
   */
  handleCancel(event: NostrEventBase, content: GigContent): boolean {
    if (content.type !== 'cancel') return false;

    const gig = GigEventHelpers.findGig(this.gigs, content.gigId);
    if (!gig) {
      console.warn(`Cannot cancel non-existent gig: ${content.gigId}`);
      return false;
    }

    try {
      gig.status = 'cancelled';
      GigEventHelpers.updateGig(
        this.gigs,
        gig,
        GigEventHelpers.toMilliseconds(event.created_at)
      );
      console.log(`Cancelled gig ${content.gigId}`);
      return true;
    } catch (error) {
      console.error(`Failed to cancel gig ${content.gigId}:`, error);
      return false;
    }
  }
}

/**
 * Event router that dispatches events to appropriate handlers
 */
export class GigEventRouter {
  private handlers: GigEventHandlers;

  constructor(gigs: Map<string, Gig>) {
    this.handlers = new GigEventHandlers(gigs);
  }

  /**
   * Route an event to the appropriate handler
   */
  route(event: NostrEventBase, content: GigContent): boolean {
    // Validate event content first
    if (!GigEventHelpers.validateEventContent(content, event)) {
      return false;
    }

    // Route to appropriate handler based on content type
    switch (content.type) {
      case 'create':
        return this.handlers.handleCreate(event, content);
      case 'apply':
        return this.handlers.handleApply(event, content);
      case 'select':
        return this.handlers.handleSelect(event, content);
      case 'funded':
        return this.handlers.handleFunded(event, content);
      case 'submit_milestone':
        return this.handlers.handleSubmitMilestone(event, content);
      case 'approve_milestone':
        return this.handlers.handleApproveMilestone(event, content);
      case 'reject_milestone':
        return this.handlers.handleRejectMilestone(event, content);
      case 'complete':
        return this.handlers.handleComplete(event, content);
      case 'cancel':
        return this.handlers.handleCancel(event, content);
      default:
        console.warn(`Unknown gig event type: ${(content as GigContent).type}`);
        return false;
    }
  }
}
