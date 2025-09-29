import { nostrValidation } from '@/lib/nostr-validation';
import type { Gig, GigApplication, GigMilestone } from '@/types/gig';
import type {
  GigContent,
  GigContentApply,
  GigContentApproveMilestone,
  GigContentCancel,
  GigContentComplete,
  GigContentCreate,
  GigContentFunded,
  GigContentRejectMilestone,
  GigContentSelect,
  GigContentSubmitMilestone,
  NostrEventBase,
} from '@/types/nostr';
import { v4 as uuidv4 } from 'uuid';
import { GigEventRouter } from './gig-event-handlers';
import { lightningService } from './lightning-service';
import { nostrService, type NostrKeys } from './nostr-service';

class GigService {
  private gigs: Map<string, Gig> = new Map();
  private systemKeys?: NostrKeys;
  private onChangeCallback?: () => void;
  private eventRouter: GigEventRouter;

  constructor() {
    this.eventRouter = new GigEventRouter(this.gigs);
  }

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

  list(): Gig[] {
    return Array.from(this.gigs.values()).sort(
      (a, b) => b.createdAt - a.createdAt
    );
  }

  getById(id: string): Gig | undefined {
    return this.gigs.get(id);
  }

  async create(input: {
    title: string;
    shortDescription: string;
    description: string;
    budgetRange?: {
      minSats: number;
      maxSats: number;
    };
    sponsorKeys: NostrKeys;
  }): Promise<Gig> {
    const id = uuidv4();
    const now = Date.now();

    const gig: Gig = {
      id,
      title: input.title,
      shortDescription: input.shortDescription,
      description: input.description,
      sponsorPubkey: input.sponsorKeys.pk,
      budgetRange: input.budgetRange,
      status: 'open',
      applications: [],
      createdAt: now,
      updatedAt: now,
    };

    this.gigs.set(id, gig);
    this.notifyChange();

    // Publish to Nostr
    const content: GigContentCreate = {
      type: 'create',
      gigId: id,
      title: gig.title,
      shortDescription: gig.shortDescription,
      description: gig.description,
      sponsorPubkey: gig.sponsorPubkey,
      budgetRange: gig.budgetRange,
    };

    await nostrService.publishGigEvent(
      input.sponsorKeys,
      'gig:create',
      content
    );

    return gig;
  }

  async apply(input: {
    gigId: string;
    portfolioLink?: string;
    offerAmountSats: number;
    milestones: Array<{
      amountSats: number;
      description: string;
      eta: number;
    }>;
    applicantKeys: NostrKeys;
  }): Promise<void> {
    const gig = this.gigs.get(input.gigId);
    if (!gig) throw new Error('Gig not found');
    if (gig.status !== 'open')
      throw new Error('Gig is not open for applications');

    // Validate milestone sum equals offer amount
    const totalMilestoneAmount = input.milestones.reduce(
      (sum, m) => sum + m.amountSats,
      0
    );
    if (totalMilestoneAmount !== input.offerAmountSats) {
      throw new Error('Total milestone amounts must equal the offer amount');
    }

    const applicationId = uuidv4();
    const now = Date.now();

    const milestones: GigMilestone[] = input.milestones.map((milestone) => ({
      id: uuidv4(),
      amountSats: milestone.amountSats,
      description: milestone.description,
      eta: milestone.eta,
      status: 'pending',
    }));

    const application: GigApplication = {
      id: applicationId,
      gigId: input.gigId,
      applicantPubkey: input.applicantKeys.pk,
      portfolioLink: input.portfolioLink,
      offerAmountSats: input.offerAmountSats,
      milestones,
      submittedAt: now,
      status: 'pending',
    };

    gig.applications.push(application);
    gig.updatedAt = now;
    this.gigs.set(input.gigId, gig);
    this.notifyChange();

    // Publish to Nostr
    const content: GigContentApply = {
      type: 'apply',
      gigId: input.gigId,
      applicationId,
      applicantPubkey: input.applicantKeys.pk,
      portfolioLink: input.portfolioLink,
      offerAmountSats: input.offerAmountSats,
      milestones: input.milestones.map((m) => ({
        id:
          milestones.find(
            (ml) =>
              ml.amountSats === m.amountSats && ml.description === m.description
          )?.id || uuidv4(),
        amountSats: m.amountSats,
        description: m.description,
        eta: m.eta,
      })),
    };

    await nostrService.publishGigEvent(
      input.applicantKeys,
      'gig:apply',
      content
    );
  }

  async selectApplication(input: {
    gigId: string;
    applicationId: string;
    sponsorKeys: NostrKeys;
  }): Promise<void> {
    const gig = this.gigs.get(input.gigId);
    if (!gig) throw new Error('Gig not found');
    if (gig.sponsorPubkey !== input.sponsorKeys.pk)
      throw new Error('Only gig creator can select applications');
    if (gig.status !== 'open') throw new Error('Gig is not open for selection');
    if (gig.selectedApplicationId)
      throw new Error('Application already selected');

    const application = gig.applications.find(
      (app) => app.id === input.applicationId
    );
    if (!application) throw new Error('Application not found');

    gig.selectedApplicationId = input.applicationId;
    gig.status = 'application_selected';
    gig.updatedAt = Date.now();
    this.gigs.set(input.gigId, gig);
    this.notifyChange();

    // Publish to Nostr
    const content: GigContentSelect = {
      type: 'select',
      gigId: input.gigId,
      applicationId: input.applicationId,
      sponsorPubkey: input.sponsorKeys.pk,
    };

    await nostrService.publishGigEvent(
      input.sponsorKeys,
      'gig:select',
      content
    );
  }

  async fundMilestone(input: {
    gigId: string;
    milestoneId: string;
    sponsorKeys: NostrKeys;
  }): Promise<{
    success: boolean;
    lightningInvoice?: string;
    paymentHash?: string;
    error?: string;
  }> {
    const gig = this.gigs.get(input.gigId);
    if (!gig) throw new Error('Gig not found');
    if (gig.sponsorPubkey !== input.sponsorKeys.pk)
      throw new Error('Only gig creator can fund');
    if (gig.status !== 'application_selected' && gig.status !== 'in_progress')
      throw new Error('Gig must have selected application or be in progress');

    const application = gig.applications.find(
      (app) => app.id === gig.selectedApplicationId
    );
    if (!application) throw new Error('Selected application not found');

    const milestone = application.milestones.find(
      (m) => m.id === input.milestoneId
    );
    if (!milestone) throw new Error('Milestone not found');
    if (milestone.status !== 'pending')
      throw new Error('Milestone is not pending');

    try {
      // Create Lightning invoice for the milestone
      const invoice = await lightningService.createInvoice(
        milestone.amountSats,
        `Milestone payment for gig ${gig.id}`,
        'gig@lightning.app'
      );

      // Mock paymentHash for now
      const mockPaymentHash =
        invoice.paymentHash ||
        `mock-payment-${gig.id}-${milestone.id}-${Date.now()}`;

      // Store the invoice details for webhook processing
      gig.pendingInvoice = {
        milestoneId: milestone.id,
        applicationId: application.id,
        amountSats: milestone.amountSats,
        paymentHash: mockPaymentHash,
        paymentRequest: invoice.paymentRequest,
      };

      gig.updatedAt = Date.now();
      this.gigs.set(input.gigId, gig);
      this.notifyChange();

      return {
        success: true,
        lightningInvoice: invoice.paymentRequest,
        paymentHash: mockPaymentHash,
      };
    } catch (error) {
      console.error('Failed to create Lightning invoice:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to create invoice',
      };
    }
  }

  async submitMilestone(input: {
    gigId: string;
    milestoneId: string;
    content: string;
    lightningAddress: string;
    submitterKeys: NostrKeys;
  }): Promise<void> {
    const gig = this.gigs.get(input.gigId);
    if (!gig) throw new Error('Gig not found');
    if (gig.status !== 'in_progress') throw new Error('Gig is not in progress');

    const application = gig.applications.find(
      (app) => app.id === gig.selectedApplicationId
    );
    if (!application) throw new Error('Selected application not found');
    if (application.applicantPubkey !== input.submitterKeys.pk)
      throw new Error('Only selected applicant can submit milestones');

    const milestone = application.milestones.find(
      (m) => m.id === input.milestoneId
    );
    if (!milestone) throw new Error('Milestone not found');
    if (milestone.status !== 'funded')
      throw new Error('Milestone is not funded yet');

    milestone.status = 'submitted';
    milestone.submittedAt = Date.now();
    milestone.submittedContent = input.content;
    milestone.submittedLightningAddress = input.lightningAddress;
    gig.updatedAt = Date.now();
    this.gigs.set(input.gigId, gig);
    this.notifyChange();

    // Publish to Nostr
    const content: GigContentSubmitMilestone = {
      type: 'submit_milestone',
      gigId: input.gigId,
      applicationId: application.id,
      milestoneId: input.milestoneId,
      content: input.content,
      lightningAddress: input.lightningAddress,
      submitterPubkey: input.submitterKeys.pk,
    };

    await nostrService.publishGigEvent(
      input.submitterKeys,
      'gig:submit_milestone',
      content
    );
  }

  async reviewMilestone(input: {
    gigId: string;
    milestoneId: string;
    action: 'approve' | 'reject';
    rejectionReason?: string;
    sponsorKeys: NostrKeys;
  }): Promise<void> {
    const gig = this.gigs.get(input.gigId);
    if (!gig) throw new Error('Gig not found');
    if (gig.sponsorPubkey !== input.sponsorKeys.pk)
      throw new Error('Only gig creator can review milestones');
    if (gig.status !== 'in_progress') throw new Error('Gig is not in progress');

    const application = gig.applications.find(
      (app) => app.id === gig.selectedApplicationId
    );
    if (!application) throw new Error('Selected application not found');

    const milestone = application.milestones.find(
      (m) => m.id === input.milestoneId
    );
    if (!milestone) throw new Error('Milestone not found');
    if (milestone.status !== 'submitted')
      throw new Error('Milestone is not submitted');

    if (input.action === 'approve') {
      // Process payment (simulated)
      if (milestone.submittedLightningAddress) {
        // In a real implementation, this would use the actual sendLightningPayment method
        // For now, we'll simulate the payment
        console.log(
          `Simulated payment of ${milestone.amountSats} sats to ${milestone.submittedLightningAddress}`
        );
      }

      milestone.status = 'accepted';
      milestone.rejectionReason = undefined;

      // Find the next milestone and make it pending for funding
      const currentMilestoneIndex = application.milestones.findIndex(
        (m) => m.id === input.milestoneId
      );
      const nextMilestone = application.milestones[currentMilestoneIndex + 1];

      if (nextMilestone) {
        if (nextMilestone.status === 'pending') {
          // Next milestone is already pending, no change needed
          console.log(`Next milestone ${nextMilestone.id} is already pending`);
        } else {
          // Next milestone exists but is not pending, make it pending
          nextMilestone.status = 'pending';
          console.log(
            `Made next milestone ${nextMilestone.id} pending for funding`
          );
        }
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
    } else {
      milestone.status = 'rejected';
      milestone.rejectionReason = input.rejectionReason;
    }

    gig.updatedAt = Date.now();
    this.gigs.set(input.gigId, gig);
    this.notifyChange();

    // Publish to Nostr
    const content: GigContentApproveMilestone | GigContentRejectMilestone =
      input.action === 'approve'
        ? {
            type: 'approve_milestone',
            gigId: input.gigId,
            applicationId: application.id,
            milestoneId: input.milestoneId,
            sponsorPubkey: input.sponsorKeys.pk,
            paymentProof: 'simulated_payment_proof', // In real implementation, this would be the actual payment proof
          }
        : {
            type: 'reject_milestone',
            gigId: input.gigId,
            applicationId: application.id,
            milestoneId: input.milestoneId,
            sponsorPubkey: input.sponsorKeys.pk,
            rejectionReason: input.rejectionReason || 'No reason provided',
          };

    await nostrService.publishGigEvent(
      input.sponsorKeys,
      input.action === 'approve'
        ? 'gig:approve_milestone'
        : 'gig:reject_milestone',
      content
    );

    // Check if all milestones are completed
    const allCompleted = application.milestones.every(
      (m) => m.status === 'accepted'
    );
    if (allCompleted) {
      await this.completeGig(input.gigId, input.sponsorKeys);
    }
  }

  async completeGig(gigId: string, sponsorKeys: NostrKeys): Promise<void> {
    const gig = this.gigs.get(gigId);
    if (!gig) throw new Error('Gig not found');
    if (gig.sponsorPubkey !== sponsorKeys.pk)
      throw new Error('Only gig creator can complete gig');

    gig.status = 'completed';
    gig.updatedAt = Date.now();
    this.gigs.set(gigId, gig);
    this.notifyChange();

    // Publish to Nostr
    const content: GigContentComplete = {
      type: 'complete',
      gigId,
      applicationId: gig.selectedApplicationId!,
      sponsorPubkey: sponsorKeys.pk,
    };

    await nostrService.publishGigEvent(sponsorKeys, 'gig:complete', content);
  }

  async cancelGig(input: {
    gigId: string;
    reason?: string;
    sponsorKeys: NostrKeys;
  }): Promise<void> {
    const gig = this.gigs.get(input.gigId);
    if (!gig) throw new Error('Gig not found');
    if (gig.sponsorPubkey !== input.sponsorKeys.pk)
      throw new Error('Only gig creator can cancel gig');
    if (gig.status !== 'open') throw new Error('Gig cannot be cancelled');
    if (gig.selectedApplicationId)
      throw new Error('Cannot cancel gig with selected application');

    gig.status = 'cancelled';
    gig.updatedAt = Date.now();
    this.gigs.set(input.gigId, gig);
    this.notifyChange();

    // Publish to Nostr
    const content: GigContentCancel = {
      type: 'cancel',
      gigId: input.gigId,
      sponsorPubkey: input.sponsorKeys.pk,
      reason: input.reason,
    };

    await nostrService.publishGigEvent(
      input.sponsorKeys,
      'gig:cancel',
      content
    );
  }

  // Load existing events from Nostr relays
  async loadExistingEvents() {
    try {
      const events = await nostrService.queryEvents([
        'gig:create',
        'gig:apply',
        'gig:select',
        'gig:funded',
        'gig:submit_milestone',
        'gig:approve_milestone',
        'gig:reject_milestone',
        'gig:complete',
        'gig:cancel',
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

          const content = JSON.parse(event.content) as GigContent;

          // Check if we should process this event
          if (!this.validateIncomingEvent(event, content)) {
            continue;
          }

          this.handleNostrEvent(event, content);
        } catch (error) {
          // Only log meaningful errors
          if (event.content && event.content.trim() !== '') {
            console.warn(
              'Failed to parse existing gig event:',
              error,
              'Event content:',
              event.content
            );
          }
        }
      }

      console.log(
        `Loaded ${sortedEvents.length} existing gig events, ${this.gigs.size} gigs in cache`
      );
      this.notifyChange();
    } catch (error) {
      console.warn('Failed to load existing gig events:', error);
    }
  }

  // Start watchers for new events
  startWatchers() {
    // Load existing events first
    this.loadExistingEvents().catch(console.error);

    // Subscribe to new gig events from Nostr relays
    nostrService.subscribeKinds(
      [
        'gig:create',
        'gig:apply',
        'gig:select',
        'gig:funded',
        'gig:submit_milestone',
        'gig:approve_milestone',
        'gig:reject_milestone',
        'gig:complete',
        'gig:cancel',
      ],
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

          const content = JSON.parse(event.content) as GigContent;

          // Check if we should process this event
          if (!this.validateIncomingEvent(event, content)) {
            return;
          }

          this.handleNostrEvent(event, content);
        } catch (error) {
          // Only log meaningful errors
          if (event.content && event.content.trim() !== '') {
            console.warn(
              'Failed to parse gig event:',
              error,
              'Event content:',
              event.content
            );
          }
        }
      }
    );

    // Subscribe to funded events from Lightning service
    lightningService.on((evt) => {
      const data = evt.data as {
        entityType: 'gig';
        gigId: string;
        paymentHash: string;
      };
      if (evt.type === 'funded' && data.entityType === 'gig') {
        const { gigId, paymentHash } = data;
        console.log('Received funded event for gig:', evt.data);

        // Validate that we have the required fields
        if (!gigId || !paymentHash) {
          console.warn(
            'Invalid gig funded event: missing gigId or paymentHash',
            data
          );
          return;
        }

        // Handle gig milestone payment confirmation
        this.handlePaymentConfirmation(paymentHash).then((paymentConfirmed) => {
          if (paymentConfirmed) {
            // Find the gig that was just funded
            for (const gig of this.gigs.values()) {
              if (gig.id === gigId) {
                const application = gig.applications.find(
                  (app) => app.id === gig.pendingInvoice!.applicationId
                );
                if (application) {
                  const milestone = application.milestones.find(
                    (m) => m.id === gig.pendingInvoice!.milestoneId
                  );
                  if (milestone) {
                    // Publish Nostr event for milestone funding
                    const content: GigContentFunded = {
                      type: 'funded',
                      gigId: gig.id,
                      applicationId: application.id,
                      milestoneId: milestone.id,
                      lightningInvoice:
                        gig.pendingInvoice?.paymentRequest || '',
                      amountSats: milestone.amountSats,
                      paymentHash: paymentHash,
                      sponsorPubkey: gig.sponsorPubkey,
                    };

                    // Use system keys to publish the event
                    if (this.systemKeys) {
                      console.log(
                        'Publishing gig:funded event for milestone:',
                        milestone.id
                      );
                      nostrService
                        .publishGigEvent(this.systemKeys, 'gig:funded', content)
                        .then(() => {
                          console.log(
                            'Published gig:funded event for milestone:',
                            milestone.id
                          );
                        })
                        .catch((error) => {
                          console.error(
                            'Failed to publish gig:funded event:',
                            error
                          );
                        });
                    }
                  }
                }
                gig.pendingInvoice = undefined;
                gig.updatedAt = Date.now();
                this.gigs.set(gig.id, gig);
                this.notifyChange();
                break;
              }
            }
          }
        });
      }
    });
  }

  // Validation of incoming nostr events
  private validateIncomingEvent(
    event: NostrEventBase,
    content: GigContent
  ): boolean {
    try {
      // TODO: Implement proper validation
      switch (content.type) {
        case 'create':
        case 'apply':
        case 'select':
        case 'funded':
        case 'submit_milestone':
        case 'approve_milestone':
        case 'reject_milestone':
        case 'complete':
        case 'cancel':
          return true;
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  // Handle webhook payment confirmation
  async handlePaymentConfirmation(paymentHash: string): Promise<boolean> {
    // Find gig with matching pending invoice
    for (const gig of this.gigs.values()) {
      if (gig.pendingInvoice?.paymentHash === paymentHash) {
        const application = gig.applications.find(
          (app) => app.id === gig.pendingInvoice!.applicationId
        );
        if (application) {
          const milestone = application.milestones.find(
            (m) => m.id === gig.pendingInvoice!.milestoneId
          );
          if (milestone) {
            // Update milestone status to funded (not submitted yet)
            milestone.status = 'funded';
            gig.status = 'in_progress';
            gig.updatedAt = Date.now();
            this.gigs.set(gig.id, gig);
            this.notifyChange();

            return true;
          }
        }
      }
    }
    return false;
  }

  private handleNostrEvent(event: NostrEventBase, content: GigContent): void {
    try {
      // Use the event router to handle the event
      const hasChanges = this.eventRouter.route(event, content);

      // Only notify listeners if there were actual changes
      if (hasChanges) {
        this.notifyChange();
      }
    } catch (error) {
      console.error(`Failed to handle gig event ${event.id}:`, error);
      // Don't re-throw to prevent breaking the event processing loop
    }
  }
}

export const gigService = new GigService();
