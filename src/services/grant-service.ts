import type { Grant, GrantApplication, GrantTranche } from '@/types/grant';
import type {
  GrantContent,
  GrantContentApply,
  GrantContentApproveTranche,
  GrantContentCancel,
  GrantContentComplete,
  GrantContentCreate,
  GrantContentFunded,
  GrantContentRejectTranche,
  GrantContentSelect,
  GrantContentSubmitTranche,
  NostrEventBase,
} from '@/types/nostr';
import { v4 as uuidv4 } from 'uuid';
import { lightningService } from './lightning-service';
import { nostrService, type NostrKeys } from './nostr-service';

class GrantService {
  private grants: Map<string, Grant> = new Map();
  private systemKeys?: NostrKeys;
  private onChangeCallback?: () => void;

  constructor() {
    this.startWatchers();
  }

  setSystemKeys(keys: NostrKeys) {
    this.systemKeys = keys;
    nostrService.setSystemKeys(keys);
  }

  setOnChangeCallback(callback: () => void) {
    this.onChangeCallback = callback;
  }

  private notifyChange() {
    this.onChangeCallback?.();
  }

  // Grant CRUD operations
  list(): Grant[] {
    return Array.from(this.grants.values());
  }

  get(id: string): Grant | undefined {
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
      amountSats: number;
      description: string;
    }>;
    sponsorKeys: NostrKeys;
  }): Promise<{ success: boolean; grantId?: string; error?: string }> {
    try {
      const grantId = uuidv4();
      const now = Date.now();

      // Create tranches
      const tranches: GrantTranche[] = input.tranches.map((tranche) => ({
        id: uuidv4(),
        amountSats: tranche.amountSats,
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

      // Publish Nostr event
      const content: GrantContentCreate = {
        type: 'create',
        grantId,
        title: input.title,
        shortDescription: input.shortDescription,
        description: input.description,
        sponsorPubkey: input.sponsorKeys.pk,
        reward: input.reward,
        tranches: input.tranches,
      };

      await nostrService.publishGrantEvent(
        input.sponsorKeys,
        'grant:create',
        content
      );
      this.notifyChange();

      return { success: true, grantId };
    } catch (error) {
      console.error('Failed to create grant:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to create grant',
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
      if (grant.status !== 'open' && grant.status !== 'partially_active') {
        throw new Error('Grant is not accepting applications');
      }

      const applicationId = uuidv4();
      const now = Date.now();

      const application: GrantApplication = {
        id: applicationId,
        grantId: input.grantId,
        applicantPubkey: input.applicantKeys.pk,
        portfolioLink: input.portfolioLink,
        proposal: input.proposal,
        budgetRequest: input.budgetRequest,
        submittedAt: now,
        status: 'pending',
      };

      grant.applications.push(application);
      grant.updatedAt = now;
      this.grants.set(input.grantId, grant);

      // Publish Nostr event
      const content: GrantContentApply = {
        type: 'apply',
        grantId: input.grantId,
        applicationId,
        applicantPubkey: input.applicantKeys.pk,
        portfolioLink: input.portfolioLink,
        proposal: input.proposal,
        budgetRequest: input.budgetRequest,
      };

      await nostrService.publishGrantEvent(
        input.applicantKeys,
        'grant:apply',
        content
      );
      this.notifyChange();

      return { success: true, applicationId };
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
    finalAllocation?: number;
    sponsorKeys: NostrKeys;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const grant = this.grants.get(input.grantId);
      if (!grant) throw new Error('Grant not found');
      if (grant.sponsorPubkey !== input.sponsorKeys.pk) {
        throw new Error('Only grant creator can select applications');
      }

      const application = grant.applications.find(
        (app) => app.id === input.applicationId
      );
      if (!application) throw new Error('Application not found');

      application.status = 'selected';
      application.selectedAt = Date.now();
      application.finalAllocation = input.finalAllocation;

      if (!grant.selectedApplicationIds.includes(input.applicationId)) {
        grant.selectedApplicationIds.push(input.applicationId);
      }

      // Update grant status
      if (grant.status === 'open') {
        grant.status = 'partially_active';
      }

      grant.updatedAt = Date.now();
      this.grants.set(input.grantId, grant);

      // Publish Nostr event
      const content: GrantContentSelect = {
        type: 'select',
        grantId: input.grantId,
        applicationId: input.applicationId,
        sponsorPubkey: input.sponsorKeys.pk,
        finalAllocation: input.finalAllocation,
      };

      await nostrService.publishGrantEvent(
        input.sponsorKeys,
        'grant:select',
        content
      );
      this.notifyChange();

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
    try {
      const grant = this.grants.get(input.grantId);
      if (!grant) throw new Error('Grant not found');
      if (grant.sponsorPubkey !== input.sponsorKeys.pk) {
        throw new Error('Only grant creator can fund tranches');
      }
      if (!grant.selectedApplicationIds.includes(input.applicationId)) {
        throw new Error('Application not selected');
      }

      const tranche = grant.tranches.find((t) => t.id === input.trancheId);
      if (!tranche) throw new Error('Tranche not found');
      if (tranche.status !== 'pending') {
        throw new Error('Tranche is not pending');
      }

      // Create Lightning invoice
      const invoice = await lightningService.createInvoice(
        tranche.amountSats,
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
        amountSats: tranche.amountSats,
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
      if (!grant.selectedApplicationIds.includes(input.applicationId)) {
        throw new Error('Application not selected');
      }

      const tranche = grant.tranches.find((t) => t.id === input.trancheId);
      if (!tranche) throw new Error('Tranche not found');
      if (tranche.status !== 'funded') {
        throw new Error('Tranche is not funded yet');
      }

      tranche.status = 'submitted';
      tranche.submittedAt = Date.now();
      tranche.submittedContent = input.content;
      tranche.submittedLinks = input.links;

      grant.updatedAt = Date.now();
      this.grants.set(input.grantId, grant);

      // Publish Nostr event
      const content: GrantContentSubmitTranche = {
        type: 'submit_tranche',
        grantId: input.grantId,
        applicationId: input.applicationId,
        trancheId: input.trancheId,
        content: input.content,
        links: input.links,
        submitterPubkey: input.submitterKeys.pk,
      };

      await nostrService.publishGrantEvent(
        input.submitterKeys,
        'grant:submit_tranche',
        content
      );
      this.notifyChange();

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
      if (grant.sponsorPubkey !== input.sponsorKeys.pk) {
        throw new Error('Only grant creator can review tranches');
      }

      const tranche = grant.tranches.find((t) => t.id === input.trancheId);
      if (!tranche) throw new Error('Tranche not found');
      if (tranche.status !== 'submitted') {
        throw new Error('Tranche is not submitted');
      }

      if (input.action === 'approve') {
        // Process payment (simulated)
        console.log(
          `Simulated payment of ${tranche.amountSats} sats for tranche ${tranche.id}`
        );

        tranche.status = 'accepted';
        tranche.rejectionReason = undefined;

        // Find the next tranche and make it funded
        const currentTrancheIndex = grant.tranches.findIndex(
          (t) => t.id === input.trancheId
        );
        const nextTranche = grant.tranches[currentTrancheIndex + 1];

        if (nextTranche) {
          nextTranche.status = 'funded';
          console.log(`Made next tranche ${nextTranche.id} funded`);
        } else {
          // No more tranches, check if all are completed
          const allCompleted = grant.tranches.every(
            (t) => t.status === 'accepted'
          );
          if (allCompleted) {
            grant.status = 'completed';
            console.log(
              'All tranches completed, grant status updated to completed'
            );
          }
        }
      } else {
        tranche.status = 'rejected';
        tranche.rejectionReason = input.rejectionReason;
      }

      grant.updatedAt = Date.now();
      this.grants.set(input.grantId, grant);

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
      this.notifyChange();

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
      if (grant.sponsorPubkey !== input.sponsorKeys.pk) {
        throw new Error('Only grant creator can cancel grant');
      }
      if (grant.status === 'completed' || grant.status === 'cancelled') {
        throw new Error('Grant cannot be cancelled');
      }

      grant.status = 'cancelled';
      grant.updatedAt = Date.now();
      this.grants.set(input.grantId, grant);

      // Publish Nostr event
      const content: GrantContentCancel = {
        type: 'cancel',
        grantId: input.grantId,
        sponsorPubkey: input.sponsorKeys.pk,
        reason: input.reason,
      };

      await nostrService.publishGrantEvent(
        input.sponsorKeys,
        'grant:cancel',
        content
      );
      this.notifyChange();

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

  // Lightning event handling
  async handlePaymentConfirmation(paymentHash: string): Promise<boolean> {
    for (const grant of this.grants.values()) {
      if (grant.pendingInvoice?.paymentHash === paymentHash) {
        const tranche = grant.tranches.find(
          (t) => t.id === grant.pendingInvoice!.trancheId
        );
        if (tranche) {
          // Update tranche status to funded
          tranche.status = 'funded';
          grant.status = 'active';

          // Clear the pending invoice
          grant.pendingInvoice = undefined;
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
  private startWatchers() {
    // Subscribe to funded events from Lightning service
    lightningService.on((evt) => {
      if (evt.type === 'funded' && evt.data?.entityType === 'grant') {
        const { grantId, paymentHash } = evt.data;
        console.log('Received funded event for grant:', evt.data);

        // Validate that we have the required fields
        if (!grantId || !paymentHash) {
          console.warn(
            'Invalid grant funded event: missing grantId or paymentHash',
            evt.data
          );
          return;
        }

        // Handle grant tranche payment confirmation
        this.handlePaymentConfirmation(paymentHash);
      }
    });
  }

  // Validation of incoming nostr events
  validateEvent(event: NostrEventBase, content: GrantContent): boolean {
    try {
      switch (content.type) {
        case 'create':
          return event.pubkey === content.sponsorPubkey;
        case 'apply':
          return event.pubkey === content.applicantPubkey;
        case 'select':
          return event.pubkey === content.sponsorPubkey;
        case 'funded':
          return event.pubkey === content.sponsorPubkey;
        case 'submit_tranche':
          return event.pubkey === content.submitterPubkey;
        case 'approve_tranche':
        case 'reject_tranche':
          return event.pubkey === content.sponsorPubkey;
        case 'complete':
          return event.pubkey === content.sponsorPubkey;
        case 'cancel':
          return event.pubkey === content.sponsorPubkey;
        default:
          return false;
      }
    } catch (error) {
      console.error('Error validating grant event:', error);
      return false;
    }
  }

  // Handle incoming nostr events
  async handleNostrEvent(event: NostrEventBase): Promise<boolean> {
    try {
      const content = JSON.parse(event.content) as GrantContent;

      if (!this.validateEvent(event, content)) {
        console.warn('Invalid grant event:', event);
        return false;
      }

      switch (content.type) {
        case 'create':
          return this.handleCreateGrant(event, content);
        case 'apply':
          return this.handleApplyToGrant(event, content);
        case 'select':
          return this.handleSelectApplication(event, content);
        case 'funded':
          return this.handleFundTranche(event, content);
        case 'submit_tranche':
          return this.handleSubmitTranche(event, content);
        case 'approve_tranche':
          return this.handleApproveTranche(event, content);
        case 'reject_tranche':
          return this.handleRejectTranche(event, content);
        case 'complete':
          return this.handleCompleteGrant(event, content);
        case 'cancel':
          return this.handleCancelGrant(event, content);
        default:
          console.warn('Unknown grant event type:', content);
          return false;
      }
    } catch (error) {
      console.error('Error handling grant event:', error);
      return false;
    }
  }

  private async handleCreateGrant(
    event: NostrEventBase,
    content: GrantContentCreate
  ): Promise<boolean> {
    try {
      const now = Date.now();
      const tranches: GrantTranche[] = content.tranches.map((tranche) => ({
        id: uuidv4(),
        amountSats: tranche.amountSats,
        description: tranche.description,
        status: 'pending',
      }));

      const grant: Grant = {
        id: content.grantId,
        title: content.title,
        shortDescription: content.shortDescription,
        description: content.description,
        sponsorPubkey: content.sponsorPubkey,
        reward: content.reward,
        tranches,
        status: 'open',
        applications: [],
        selectedApplicationIds: [],
        createdAt: now,
        updatedAt: now,
      };

      this.grants.set(content.grantId, grant);
      this.notifyChange();
      return true;
    } catch (error) {
      console.error('Failed to handle create grant event:', error);
      return false;
    }
  }

  private async handleApplyToGrant(
    event: NostrEventBase,
    content: GrantContentApply
  ): Promise<boolean> {
    try {
      const grant = this.grants.get(content.grantId);
      if (!grant) return false;

      const application: GrantApplication = {
        id: content.applicationId,
        grantId: content.grantId,
        applicantPubkey: content.applicantPubkey,
        portfolioLink: content.portfolioLink,
        proposal: content.proposal,
        budgetRequest: content.budgetRequest,
        submittedAt: event.created_at * 1000,
        status: 'pending',
      };

      grant.applications.push(application);
      grant.updatedAt = event.created_at * 1000;
      this.grants.set(content.grantId, grant);
      this.notifyChange();
      return true;
    } catch (error) {
      console.error('Failed to handle apply to grant event:', error);
      return false;
    }
  }

  private async handleSelectApplication(
    event: NostrEventBase,
    content: GrantContentSelect
  ): Promise<boolean> {
    try {
      const grant = this.grants.get(content.grantId);
      if (!grant) return false;

      const application = grant.applications.find(
        (app) => app.id === content.applicationId
      );
      if (!application) return false;

      application.status = 'selected';
      application.selectedAt = event.created_at * 1000;
      application.finalAllocation = content.finalAllocation;

      if (!grant.selectedApplicationIds.includes(content.applicationId)) {
        grant.selectedApplicationIds.push(content.applicationId);
      }

      if (grant.status === 'open') {
        grant.status = 'partially_active';
      }

      grant.updatedAt = event.created_at * 1000;
      this.grants.set(content.grantId, grant);
      this.notifyChange();
      return true;
    } catch (error) {
      console.error('Failed to handle select application event:', error);
      return false;
    }
  }

  private async handleFundTranche(
    event: NostrEventBase,
    content: GrantContentFunded
  ): Promise<boolean> {
    try {
      const grant = this.grants.get(content.grantId);
      if (!grant) return false;

      const tranche = grant.tranches.find((t) => t.id === content.trancheId);
      if (!tranche) return false;

      tranche.status = 'funded';
      grant.status = 'active';
      grant.updatedAt = event.created_at * 1000;
      this.grants.set(content.grantId, grant);
      this.notifyChange();
      return true;
    } catch (error) {
      console.error('Failed to handle fund tranche event:', error);
      return false;
    }
  }

  private async handleSubmitTranche(
    event: NostrEventBase,
    content: GrantContentSubmitTranche
  ): Promise<boolean> {
    try {
      const grant = this.grants.get(content.grantId);
      if (!grant) return false;

      const tranche = grant.tranches.find((t) => t.id === content.trancheId);
      if (!tranche) return false;

      tranche.status = 'submitted';
      tranche.submittedAt = event.created_at * 1000;
      tranche.submittedContent = content.content;
      tranche.submittedLinks = content.links;

      grant.updatedAt = event.created_at * 1000;
      this.grants.set(content.grantId, grant);
      this.notifyChange();
      return true;
    } catch (error) {
      console.error('Failed to handle submit tranche event:', error);
      return false;
    }
  }

  private async handleApproveTranche(
    event: NostrEventBase,
    content: GrantContentApproveTranche
  ): Promise<boolean> {
    try {
      const grant = this.grants.get(content.grantId);
      if (!grant) return false;

      const tranche = grant.tranches.find((t) => t.id === content.trancheId);
      if (!tranche) return false;

      tranche.status = 'accepted';
      tranche.rejectionReason = undefined;

      // Find the next tranche and make it funded
      const currentTrancheIndex = grant.tranches.findIndex(
        (t) => t.id === content.trancheId
      );
      const nextTranche = grant.tranches[currentTrancheIndex + 1];

      if (nextTranche) {
        nextTranche.status = 'funded';
      } else {
        // No more tranches, check if all are completed
        const allCompleted = grant.tranches.every(
          (t) => t.status === 'accepted'
        );
        if (allCompleted) {
          grant.status = 'completed';
        }
      }

      grant.updatedAt = event.created_at * 1000;
      this.grants.set(content.grantId, grant);
      this.notifyChange();
      return true;
    } catch (error) {
      console.error('Failed to handle approve tranche event:', error);
      return false;
    }
  }

  private async handleRejectTranche(
    event: NostrEventBase,
    content: GrantContentRejectTranche
  ): Promise<boolean> {
    try {
      const grant = this.grants.get(content.grantId);
      if (!grant) return false;

      const tranche = grant.tranches.find((t) => t.id === content.trancheId);
      if (!tranche) return false;

      tranche.status = 'rejected';
      tranche.rejectionReason = content.rejectionReason;

      grant.updatedAt = event.created_at * 1000;
      this.grants.set(content.grantId, grant);
      this.notifyChange();
      return true;
    } catch (error) {
      console.error('Failed to handle reject tranche event:', error);
      return false;
    }
  }

  private async handleCompleteGrant(
    event: NostrEventBase,
    content: GrantContentComplete
  ): Promise<boolean> {
    try {
      const grant = this.grants.get(content.grantId);
      if (!grant) return false;

      grant.status = 'completed';
      grant.updatedAt = event.created_at * 1000;
      this.grants.set(content.grantId, grant);
      this.notifyChange();
      return true;
    } catch (error) {
      console.error('Failed to handle complete grant event:', error);
      return false;
    }
  }

  private async handleCancelGrant(
    event: NostrEventBase,
    content: GrantContentCancel
  ): Promise<boolean> {
    try {
      const grant = this.grants.get(content.grantId);
      if (!grant) return false;

      grant.status = 'cancelled';
      grant.updatedAt = event.created_at * 1000;
      this.grants.set(content.grantId, grant);
      this.notifyChange();
      return true;
    } catch (error) {
      console.error('Failed to handle cancel grant event:', error);
      return false;
    }
  }
}

export const grantService = new GrantService();
