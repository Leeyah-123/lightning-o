import { nostrValidation } from '@/lib/nostr-validation';
import type { Grant, GrantApplication, GrantTranche } from '@/types/grant';
import type {
  GrantContent,
  GrantContentApply,
  GrantContentApproveTranche,
  GrantContentCancel,
  GrantContentCreate,
  GrantContentFunded,
  GrantContentRejectTranche,
  GrantContentSelect,
  GrantContentSubmitTranche,
  NostrEventBase,
} from '@/types/nostr';
import { v4 as uuidv4 } from 'uuid';
import { GrantEventRouter } from './grant-event-handlers';
import { lightningService } from './lightning-service';
import { nostrService, type NostrKeys } from './nostr-service';

class GrantService {
  private grants: Map<string, Grant> = new Map();
  private systemKeys?: NostrKeys;
  private eventRouter: GrantEventRouter;
  private changeListeners: Set<() => void> = new Set();

  constructor() {
    this.eventRouter = new GrantEventRouter(this.grants);
  }

  setSystemKeys(keys: NostrKeys) {
    this.systemKeys = keys;
  }

  subscribeToChanges(callback: () => void) {
    this.changeListeners.add(callback);
    return () => this.changeListeners.delete(callback);
  }

  private notifyChange() {
    this.changeListeners.forEach((callback) => callback());
  }

  // Grant CRUD operations
  list(): Grant[] {
    return Array.from(this.grants.values()).sort(
      (a, b) => b.createdAt - a.createdAt
    );
  }

  // Populate the service with cached data
  populateFromCache(grants: Grant[]) {
    this.grants.clear();
    grants.forEach((grant) => {
      this.grants.set(grant.id, grant);
    });
  }

  findById(id: string): Grant | undefined {
    return this.grants.get(id);
  }

  async createGrant(input: {
    title: string;
    shortDescription: string;
    description: string;
    reward: {
      type: 'fixed' | 'range';
      amount: number;
      maxAmount?: number;
    };
    tranches: Array<{
      amount: number;
      maxAmount?: number;
      description: string;
    }>;
    sponsorKeys: NostrKeys;
  }): Promise<{ success: boolean; error?: string; grant: Grant | null }> {
    try {
      const grantId = uuidv4();
      const now = Date.now();

      // Create tranches
      const tranches: GrantTranche[] = input.tranches.map((tranche) => ({
        id: uuidv4(),
        amount: tranche.amount,
        maxAmount: tranche.maxAmount,
        description: tranche.description,
        status: 'pending',
      }));

      const grant: Grant = {
        id: grantId,
        title: input.title,
        shortDescription: input.shortDescription,
        description: input.description,
        sponsorPubkey: input.sponsorKeys.pk,
        reward: input.reward,
        tranches,
        status: 'open',
        applications: [],
        selectedApplicationIds: [],
        createdAt: now,
        updatedAt: now,
      };

      this.grants.set(grantId, grant);
      this.notifyChange();

      const content: GrantContentCreate = {
        type: 'create',
        grantId: grant.id,
        title: grant.title,
        shortDescription: grant.shortDescription,
        description: grant.description,
        sponsorPubkey: grant.sponsorPubkey,
        reward: grant.reward,
        tranches: grant.tranches.map((t) => ({
          id: t.id,
          amount: t.amount,
          maxAmount: t.maxAmount,
          description: t.description,
        })),
      };

      await nostrService.publishGrantEvent(
        input.sponsorKeys,
        'grant:create',
        content
      );

      return { success: true, grant };
    } catch (error) {
      console.error('Failed to create grant:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to create grant',
        grant: null,
      };
    }
  }

  async applyToGrant(input: {
    grantId: string;
    portfolioLink?: string;
    proposal: string;
    budgetRequest?: number;
    applicantKeys: NostrKeys;
  }): Promise<{ success: boolean; applicationId?: string; error?: string }> {
    try {
      const grant = this.grants.get(input.grantId);
      if (!grant) throw new Error('Grant not found');
      if (grant.status !== 'open')
        throw new Error('Grant is not open for applications');

      const applicationId = uuidv4();
      const newApplication: GrantApplication = {
        id: applicationId,
        grantId: input.grantId,
        applicantPubkey: input.applicantKeys.pk,
        portfolioLink: input.portfolioLink,
        proposal: input.proposal,
        budgetRequest: input.budgetRequest,
        submittedAt: Date.now(),
        status: 'pending',
      };

      grant.applications.push(newApplication);
      grant.updatedAt = Date.now();
      this.grants.set(input.grantId, grant);
      this.notifyChange();
      this.notifyChange();

      const content: GrantContentApply = {
        type: 'apply',
        grantId: grant.id,
        applicationId: newApplication.id,
        applicantPubkey: newApplication.applicantPubkey,
        portfolioLink: newApplication.portfolioLink,
        proposal: newApplication.proposal,
        budgetRequest: newApplication.budgetRequest,
      };

      await nostrService.publishGrantEvent(
        input.applicantKeys,
        'grant:apply',
        content
      );

      return { success: true, applicationId: newApplication.id };
    } catch (error) {
      console.error('Failed to apply to grant:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to apply to grant',
      };
    }
  }

  async selectApplication(input: {
    grantId: string;
    applicationId: string;
    sponsorKeys: NostrKeys;
    finalAllocation?: number;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const grant = this.grants.get(input.grantId);
      if (!grant) throw new Error('Grant not found');
      if (grant.sponsorPubkey !== input.sponsorKeys.pk)
        throw new Error('Only grant creator can select applications');

      const application = grant.applications.find(
        (app) => app.id === input.applicationId
      );
      if (!application) throw new Error('Application not found');
      if (application.status !== 'pending')
        throw new Error('Application is not pending');

      application.status = 'selected';
      application.finalAllocation = input.finalAllocation;
      grant.selectedApplicationIds.push(application.id);

      // Make the first tranche pending for funding when an application is selected
      if (grant.tranches.length > 0) {
        grant.tranches[0].status = 'pending';
      }

      grant.updatedAt = Date.now();
      this.grants.set(input.grantId, grant);
      this.notifyChange();

      const content: GrantContentSelect = {
        type: 'select',
        grantId: grant.id,
        applicationId: application.id,
        sponsorPubkey: grant.sponsorPubkey,
        finalAllocation: application.finalAllocation,
      };

      await nostrService.publishGrantEvent(
        input.sponsorKeys,
        'grant:select',
        content
      );

      return { success: true };
    } catch (error) {
      console.error('Failed to select application:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to select application',
      };
    }
  }

  async fundTranche(input: {
    grantId: string;
    applicationId: string;
    trancheId: string;
    sponsorKeys: NostrKeys;
  }): Promise<{
    success: boolean;
    lightningInvoice?: string;
    paymentHash?: string;
    error?: string;
  }> {
    const grant = this.grants.get(input.grantId);
    if (!grant) throw new Error('Grant not found');
    if (grant.sponsorPubkey !== input.sponsorKeys.pk)
      throw new Error('Only grant creator can fund tranches');
    if (!grant.selectedApplicationIds.includes(input.applicationId))
      throw new Error('Application not selected');

    const tranche = grant.tranches.find((t) => t.id === input.trancheId);
    if (!tranche) throw new Error('Tranche not found');
    if (tranche.status !== 'pending') throw new Error('Tranche is not pending');

    // Check if this is the next tranche that should be funded (sequential funding)
    const currentTrancheIndex = grant.tranches.findIndex(
      (t) => t.id === input.trancheId
    );
    const previousTranche = grant.tranches[currentTrancheIndex - 1];

    // If this is not the first tranche, the previous one must be accepted
    if (
      currentTrancheIndex > 0 &&
      (!previousTranche || previousTranche.status !== 'accepted')
    ) {
      throw new Error(
        'Previous tranche must be completed before funding this tranche'
      );
    }

    // Check if there's already a pending invoice for this application
    if (
      grant.pendingInvoice &&
      grant.pendingInvoice.applicationId === input.applicationId
    ) {
      throw new Error(
        'Another tranche is already being funded for this application'
      );
    }

    try {
      const invoice = await lightningService.createInvoice(
        tranche.maxAmount || tranche.amount,
        `Tranche payment for grant ${grant.id}`,
        'grant@lightning.app'
      );

      // Mock paymentHash for now
      const mockPaymentHash =
        invoice.paymentHash ||
        `mock-payment-${grant.id}-${tranche.id}-${Date.now()}`;

      grant.pendingInvoice = {
        applicationId: input.applicationId,
        trancheId: tranche.id,
        amountSats: tranche.maxAmount || tranche.amount,
        paymentHash: mockPaymentHash,
        paymentRequest: invoice.paymentRequest,
      };

      grant.updatedAt = Date.now();
      this.grants.set(input.grantId, grant);
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

  async submitTranche(input: {
    grantId: string;
    applicationId: string;
    trancheId: string;
    content: string;
    links?: string[];
    submitterKeys: NostrKeys;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const grant = this.grants.get(input.grantId);
      if (!grant) throw new Error('Grant not found');
      if (!grant.selectedApplicationIds.includes(input.applicationId))
        throw new Error('Application not selected');

      const application = grant.applications.find(
        (app) => app.id === input.applicationId
      );
      if (!application) throw new Error('Application not found');
      if (application.applicantPubkey !== input.submitterKeys.pk)
        throw new Error('Only selected applicant can submit tranches');

      const tranche = grant.tranches.find((t) => t.id === input.trancheId);
      if (!tranche) throw new Error('Tranche not found');
      if (tranche.status !== 'funded')
        throw new Error('Tranche is not funded yet');

      tranche.status = 'submitted';
      tranche.submittedAt = Date.now();
      tranche.submittedContent = input.content;
      tranche.submittedLinks = input.links;
      grant.updatedAt = Date.now();
      this.grants.set(input.grantId, grant);
      this.notifyChange();

      const content: GrantContentSubmitTranche = {
        type: 'submit_tranche',
        grantId: grant.id,
        applicationId: application.id,
        trancheId: tranche.id,
        content: input.content,
        links: input.links,
        submitterPubkey: input.submitterKeys.pk,
      };

      await nostrService.publishGrantEvent(
        input.submitterKeys,
        'grant:submit_tranche',
        content
      );

      return { success: true };
    } catch (error) {
      console.error('Failed to submit tranche:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to submit tranche',
      };
    }
  }

  async reviewTranche(input: {
    grantId: string;
    applicationId: string;
    trancheId: string;
    action: 'approve' | 'reject';
    rejectionReason?: string;
    sponsorKeys: NostrKeys;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const grant = this.grants.get(input.grantId);
      if (!grant) throw new Error('Grant not found');
      if (grant.sponsorPubkey !== input.sponsorKeys.pk)
        throw new Error('Only grant creator can review tranches');

      const application = grant.applications.find(
        (app) => app.id === input.applicationId
      );
      if (!application) throw new Error('Application not found');
      if (!grant.selectedApplicationIds.includes(application.id))
        throw new Error('Application not selected for this grant');

      const tranche = grant.tranches.find((t) => t.id === input.trancheId);
      if (!tranche) throw new Error('Tranche not found');
      if (tranche.status !== 'submitted' && tranche.status !== 'rejected')
        throw new Error('Tranche is not submitted or rejected');

      if (input.action === 'approve') {
        // Process payment (simulated)
        console.log(
          `Simulated payment of ${
            tranche.maxAmount || tranche.amount
          } sats for tranche ${tranche.id}`
        );

        tranche.status = 'accepted';
        tranche.rejectionReason = undefined;

        // Find the next tranche and make it pending for funding
        const currentTrancheIndex = grant.tranches.findIndex(
          (t) => t.id === input.trancheId
        );
        const nextTranche = grant.tranches[currentTrancheIndex + 1];

        if (nextTranche) {
          nextTranche.status = 'pending';
        }
      } else {
        tranche.status = 'rejected';
        tranche.rejectionReason = input.rejectionReason;
      }

      grant.updatedAt = Date.now();
      this.grants.set(input.grantId, grant);
      this.notifyChange();

      // Publish Nostr event
      const content: GrantContentApproveTranche | GrantContentRejectTranche =
        input.action === 'approve'
          ? {
              type: 'approve_tranche',
              grantId: input.grantId,
              applicationId: input.applicationId,
              trancheId: input.trancheId,
              sponsorPubkey: input.sponsorKeys.pk,
              paymentProof: `payment-proof-${Date.now()}`,
            }
          : {
              type: 'reject_tranche',
              grantId: input.grantId,
              applicationId: input.applicationId,
              trancheId: input.trancheId,
              sponsorPubkey: input.sponsorKeys.pk,
              rejectionReason: input.rejectionReason || 'No reason provided',
            };

      await nostrService.publishGrantEvent(
        input.sponsorKeys,
        input.action === 'approve'
          ? 'grant:approve_tranche'
          : 'grant:reject_tranche',
        content
      );

      return { success: true };
    } catch (error) {
      console.error('Failed to review tranche:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to review tranche',
      };
    }
  }

  async cancelGrant(input: {
    grantId: string;
    reason?: string;
    sponsorKeys: NostrKeys;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const grant = this.grants.get(input.grantId);
      if (!grant) throw new Error('Grant not found');
      if (grant.sponsorPubkey !== input.sponsorKeys.pk)
        throw new Error('Only grant creator can cancel a grant');
      grant.status = 'closed';

      grant.updatedAt = Date.now();
      this.grants.set(input.grantId, grant);
      this.notifyChange();

      const content: GrantContentCancel = {
        type: 'cancel',
        grantId: grant.id,
        sponsorPubkey: grant.sponsorPubkey,
        reason: input.reason,
      };

      await nostrService.publishGrantEvent(
        input.sponsorKeys,
        'grant:cancel',
        content
      );

      return { success: true };
    } catch (error) {
      console.error('Failed to cancel grant:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to cancel grant',
      };
    }
  }

  // Handle payment confirmation from Lightning service
  async handlePaymentConfirmation(paymentHash: string): Promise<boolean> {
    for (const grant of this.grants.values()) {
      if (
        grant.pendingInvoice &&
        grant.pendingInvoice.paymentHash === paymentHash
      ) {
        const tranche = grant.tranches.find(
          (t) => t.id === grant.pendingInvoice!.trancheId
        );
        if (tranche) {
          tranche.status = 'funded';
          grant.updatedAt = Date.now();
          this.grants.set(grant.id, grant);
          this.notifyChange();
          return true;
        }
      }
    }
    return false;
  }

  // Event watchers
  startWatchers() {
    // Load existing events first
    this.loadExistingEvents().catch(console.error);

    // Subscribe to new grant events from Nostr relays
    nostrService.subscribeKinds(
      [
        'grant:create',
        'grant:apply',
        'grant:select',
        'grant:funded',
        'grant:submit_tranche',
        'grant:approve_tranche',
        'grant:reject_tranche',
        'grant:cancel',
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

          const content = JSON.parse(event.content) as GrantContent;

          // Check if we should process this event
          if (!this.validateIncomingEvent(event, content)) {
            return;
          }

          this.handleNostrEvent(event, content);
        } catch (error) {
          // Only log meaningful errors
          if (event.content && event.content.trim() !== '') {
            console.warn(
              'Failed to parse grant event:',
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
        entityType: 'grant';
        grantId: string;
        paymentHash: string;
      };
      if (evt.type === 'funded' && data.entityType === 'grant') {
        const { grantId, paymentHash } = data;
        console.log('Received funded event for grant:', evt.data);

        // Validate that we have the required fields
        if (!grantId || !paymentHash) {
          console.warn(
            'Invalid grant funded event: missing grantId or paymentHash',
            data
          );
          return;
        }

        // Handle grant tranche payment confirmation
        this.handlePaymentConfirmation(paymentHash).then((paymentConfirmed) => {
          if (paymentConfirmed) {
            // Find the grant that was just funded
            for (const grant of this.grants.values()) {
              if (grant.id === grantId) {
                const application = grant.applications.find(
                  (app) => app.id === grant.pendingInvoice!.applicationId
                );
                if (application) {
                  const tranche = grant.tranches.find(
                    (t) => t.id === grant.pendingInvoice!.trancheId
                  );
                  if (tranche) {
                    // Publish Nostr event for tranche funding
                    const content: GrantContentFunded = {
                      type: 'funded',
                      grantId: grant.id,
                      applicationId: application.id,
                      trancheId: tranche.id,
                      lightningInvoice:
                        grant.pendingInvoice?.paymentRequest || '',
                      amountSats: tranche.maxAmount || tranche.amount,
                      paymentHash: paymentHash,
                      sponsorPubkey: grant.sponsorPubkey,
                    };

                    // Use system keys to publish the event
                    if (this.systemKeys) {
                      nostrService
                        .publishGrantEvent(
                          this.systemKeys,
                          'grant:funded',
                          content
                        )
                        .then(() => {
                          console.log(
                            'Published grant:funded event for tranche:',
                            tranche.id
                          );
                        })
                        .catch((error) => {
                          console.error(
                            'Failed to publish grant:funded event:',
                            error
                          );
                        });
                    }
                  }
                }
                grant.pendingInvoice = undefined;
                grant.updatedAt = Date.now();
                this.grants.set(grant.id, grant);
                this.notifyChange();
                break;
              }
            }
          }
        });
      }
    });
  }

  // Load existing events from relays
  private async loadExistingEvents() {
    try {
      const events = await nostrService.queryEvents([
        'grant:create',
        'grant:apply',
        'grant:select',
        'grant:funded',
        'grant:submit_tranche',
        'grant:approve_tranche',
        'grant:reject_tranche',
        'grant:cancel',
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

          const content = JSON.parse(event.content) as GrantContent;

          // Check if we should process this event
          if (!this.validateIncomingEvent(event, content)) {
            continue;
          }

          await this.handleNostrEvent(event, content);
        } catch (error) {
          // Only log meaningful errors
          if (event.content && event.content.trim() !== '') {
            console.warn(
              'Failed to parse grant event during load:',
              error,
              'Event content:',
              event.content
            );
          }
        }
      }

      console.log(`Loaded ${sortedEvents.length} existing grant events`);
      this.notifyChange();
    } catch (error) {
      console.error('Failed to load existing grant events:', error);
    }
  }

  // Validate incoming event before processing
  private validateIncomingEvent(
    event: NostrEventBase,
    content: GrantContent
  ): boolean {
    try {
      // Basic validation - check if content structure is valid
      if (!content || typeof content !== 'object') {
        return false;
      }

      // Check required fields based on content type
      switch (content.type) {
        case 'create':
          return !!(
            content.grantId &&
            content.title &&
            content.shortDescription &&
            content.description &&
            content.sponsorPubkey &&
            content.reward &&
            content.tranches &&
            Array.isArray(content.tranches)
          );

        case 'apply':
          return !!(
            content.grantId &&
            content.applicationId &&
            content.applicantPubkey &&
            content.proposal
          );

        case 'select':
          return !!(
            content.grantId &&
            content.applicationId &&
            content.sponsorPubkey
          );

        case 'funded':
          return !!(
            content.grantId &&
            content.applicationId &&
            content.trancheId &&
            content.lightningInvoice &&
            content.amountSats &&
            content.paymentHash &&
            content.sponsorPubkey
          );

        case 'submit_tranche':
          return !!(
            content.grantId &&
            content.applicationId &&
            content.trancheId &&
            content.content &&
            content.submitterPubkey
          );

        case 'approve_tranche':
        case 'reject_tranche':
          return !!(
            content.grantId &&
            content.applicationId &&
            content.trancheId &&
            content.sponsorPubkey
          );

        case 'cancel':
          return !!(content.grantId && content.sponsorPubkey);

        default:
          return false;
      }
    } catch (error) {
      console.warn('Failed to validate incoming grant event:', error);
      return false;
    }
  }

  // Handle Nostr events using the event router
  private async handleNostrEvent(
    event: NostrEventBase,
    content: GrantContent
  ): Promise<void> {
    try {
      await this.eventRouter.handleEvent(event, content);
    } catch (error) {
      console.error('Error handling grant Nostr event:', error);
    }
  }
}

export const grantService = new GrantService();
