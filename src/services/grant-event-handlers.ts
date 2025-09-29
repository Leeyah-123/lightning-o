import type { Grant, GrantApplication, GrantTranche } from '@/types/grant';
import type { GrantContent, NostrEventBase } from '@/types/nostr';

/**
 * Helper functions for grant event processing
 */
export class GrantEventHelpers {
  /**
   * Safely find a grant by ID
   */
  static findGrant(grants: Map<string, Grant>, grantId: string): Grant | null {
    try {
      return grants.get(grantId) || null;
    } catch (error) {
      console.warn(`Failed to find grant ${grantId}:`, error);
      return null;
    }
  }

  /**
   * Safely find an application within a grant
   */
  static findApplication(
    grant: Grant,
    applicationId: string
  ): GrantApplication | null {
    try {
      return (
        grant.applications?.find((app) => app.id === applicationId) || null
      );
    } catch (error) {
      console.warn(
        `Failed to find application ${applicationId} in grant ${grant.id}:`,
        error
      );
      return null;
    }
  }

  /**
   * Safely find a tranche within a grant
   */
  static findTranche(grant: Grant, trancheId: string): GrantTranche | null {
    try {
      return grant.tranches?.find((t) => t.id === trancheId) || null;
    } catch (error) {
      console.warn(
        `Failed to find tranche ${trancheId} in grant ${grant.id}:`,
        error
      );
      return null;
    }
  }

  /**
   * Update grant and save to map
   */
  static updateGrant(grants: Map<string, Grant>, grant: Grant): boolean {
    try {
      grant.updatedAt = Date.now();
      grants.set(grant.id, grant);
      return true;
    } catch (error) {
      console.error(`Failed to update grant ${grant.id}:`, error);
      return false;
    }
  }

  /**
   * Validate grant content structure
   */
  static validateGrantContent(content: GrantContent): boolean {
    try {
      // Basic structure validation
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
            (content as any).amountSats &&
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
      console.warn('Failed to validate grant content:', error);
      return false;
    }
  }

  /**
   * Validate event pubkey matches content
   */
  static validateEventPubkey(
    event: NostrEventBase,
    content: GrantContent
  ): boolean {
    try {
      // For sponsor actions, pubkey should match sponsorPubkey
      if ('sponsorPubkey' in content && content.sponsorPubkey) {
        return event.pubkey === content.sponsorPubkey;
      }

      // For applicant actions, pubkey should match applicantPubkey
      if ('applicantPubkey' in content && content.applicantPubkey) {
        return event.pubkey === content.applicantPubkey;
      }

      // For submitter actions, pubkey should match submitterPubkey
      if ('submitterPubkey' in content && content.submitterPubkey) {
        return event.pubkey === content.submitterPubkey;
      }

      return true;
    } catch (error) {
      console.warn('Failed to validate event pubkey:', error);
      return false;
    }
  }
}

/**
 * Centralized event router for grant events
 */
export class GrantEventRouter {
  private grants: Map<string, Grant>;
  private onChangeCallback?: () => void;

  constructor(grants: Map<string, Grant>, onChangeCallback?: () => void) {
    this.grants = grants;
    this.onChangeCallback = onChangeCallback;
  }

  setOnChangeCallback(callback: () => void) {
    this.onChangeCallback = callback;
  }

  private notifyChange() {
    this.onChangeCallback?.();
  }

  /**
   * Route grant events to appropriate handlers
   */
  async handleEvent(
    event: NostrEventBase,
    content: GrantContent
  ): Promise<boolean> {
    try {
      // Validate content structure
      if (!GrantEventHelpers.validateGrantContent(content)) {
        console.warn('Invalid grant content structure:', content);
        return false;
      }

      // Validate event pubkey matches content
      if (!GrantEventHelpers.validateEventPubkey(event, content)) {
        console.warn('Event pubkey does not match content:', {
          eventPubkey: event.pubkey,
          content,
        });
        return false;
      }

      let handled = false;

      switch (content.type) {
        case 'create':
          handled = await this.handleCreateGrant(event, content);
          break;
        case 'apply':
          handled = await this.handleApplyToGrant(event, content);
          break;
        case 'select':
          handled = await this.handleSelectApplication(event, content);
          break;
        case 'funded':
          handled = await this.handleFundTranche(event, content);
          break;
        case 'submit_tranche':
          handled = await this.handleSubmitTranche(event, content);
          break;
        case 'approve_tranche':
          handled = await this.handleApproveTranche(event, content);
          break;
        case 'reject_tranche':
          handled = await this.handleRejectTranche(event, content);
          break;
        case 'cancel':
          handled = await this.handleCancelGrant(event, content);
          break;
        default:
          console.warn('Unknown grant event type:', (content as any).type);
          return false;
      }

      if (handled) {
        this.notifyChange();
      }

      return handled;
    } catch (error) {
      console.error('Error handling grant event:', error);
      return false;
    }
  }

  private async handleCreateGrant(
    event: NostrEventBase,
    content: any
  ): Promise<boolean> {
    try {
      const grant: Grant = {
        id: content.grantId,
        title: content.title,
        shortDescription: content.shortDescription,
        description: content.description,
        sponsorPubkey: content.sponsorPubkey,
        reward: content.reward,
        tranches: content.tranches.map((t: any) => ({
          id: `tranche-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          amount: t.amount,
          maxAmount: t.maxAmount,
          description: t.description,
          status: 'pending',
        })),
        applications: [],
        selectedApplicationIds: [],
        status: 'open',
        createdAt: event.created_at * 1000,
        updatedAt: Date.now(),
      };

      return GrantEventHelpers.updateGrant(this.grants, grant);
    } catch (error) {
      console.error('Error handling create grant event:', error);
      return false;
    }
  }

  private async handleApplyToGrant(
    event: NostrEventBase,
    content: any
  ): Promise<boolean> {
    try {
      const grant = GrantEventHelpers.findGrant(this.grants, content.grantId);
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
      grant.updatedAt = Date.now();

      return GrantEventHelpers.updateGrant(this.grants, grant);
    } catch (error) {
      console.error('Error handling apply to grant event:', error);
      return false;
    }
  }

  private async handleSelectApplication(
    event: NostrEventBase,
    content: any
  ): Promise<boolean> {
    try {
      const grant = GrantEventHelpers.findGrant(this.grants, content.grantId);
      if (!grant) return false;

      const application = GrantEventHelpers.findApplication(
        grant,
        content.applicationId
      );
      if (!application) return false;

      application.status = 'selected';
      application.finalAllocation = content.finalAllocation;
      grant.selectedApplicationIds.push(application.id);

      // Grant remains open for more applications

      grant.updatedAt = Date.now();

      return GrantEventHelpers.updateGrant(this.grants, grant);
    } catch (error) {
      console.error('Error handling select application event:', error);
      return false;
    }
  }

  private async handleFundTranche(
    event: NostrEventBase,
    content: any
  ): Promise<boolean> {
    try {
      const grant = GrantEventHelpers.findGrant(this.grants, content.grantId);
      if (!grant) return false;

      const tranche = GrantEventHelpers.findTranche(grant, content.trancheId);
      if (!tranche) return false;

      tranche.status = 'funded';
      grant.updatedAt = Date.now();

      return GrantEventHelpers.updateGrant(this.grants, grant);
    } catch (error) {
      console.error('Error handling fund tranche event:', error);
      return false;
    }
  }

  private async handleSubmitTranche(
    event: NostrEventBase,
    content: any
  ): Promise<boolean> {
    try {
      const grant = GrantEventHelpers.findGrant(this.grants, content.grantId);
      if (!grant) return false;

      const tranche = GrantEventHelpers.findTranche(grant, content.trancheId);
      if (!tranche) return false;

      tranche.status = 'submitted';
      tranche.submittedAt = event.created_at * 1000;
      tranche.submittedContent = content.content;
      tranche.submittedLinks = content.links;
      grant.updatedAt = Date.now();

      return GrantEventHelpers.updateGrant(this.grants, grant);
    } catch (error) {
      console.error('Error handling submit tranche event:', error);
      return false;
    }
  }

  private async handleApproveTranche(
    event: NostrEventBase,
    content: any
  ): Promise<boolean> {
    try {
      const grant = GrantEventHelpers.findGrant(this.grants, content.grantId);
      if (!grant) return false;

      const tranche = GrantEventHelpers.findTranche(grant, content.trancheId);
      if (!tranche) return false;

      tranche.status = 'accepted';
      tranche.rejectionReason = undefined;

      // Find the next tranche and make it pending for funding
      const currentTrancheIndex = grant.tranches.findIndex(
        (t) => t.id === content.trancheId
      );
      const nextTranche = grant.tranches[currentTrancheIndex + 1];

      if (nextTranche) {
        nextTranche.status = 'pending';
      }

      grant.updatedAt = Date.now();

      return GrantEventHelpers.updateGrant(this.grants, grant);
    } catch (error) {
      console.error('Error handling approve tranche event:', error);
      return false;
    }
  }

  private async handleRejectTranche(
    event: NostrEventBase,
    content: any
  ): Promise<boolean> {
    try {
      const grant = GrantEventHelpers.findGrant(this.grants, content.grantId);
      if (!grant) return false;

      const tranche = GrantEventHelpers.findTranche(grant, content.trancheId);
      if (!tranche) return false;

      tranche.status = 'rejected';
      tranche.rejectionReason = content.rejectionReason;
      grant.updatedAt = Date.now();

      return GrantEventHelpers.updateGrant(this.grants, grant);
    } catch (error) {
      console.error('Error handling reject tranche event:', error);
      return false;
    }
  }

  private async handleCancelGrant(
    event: NostrEventBase,
    content: any
  ): Promise<boolean> {
    try {
      const grant = GrantEventHelpers.findGrant(this.grants, content.grantId);
      if (!grant) return false;

      grant.status = 'closed';

      grant.updatedAt = Date.now();

      return GrantEventHelpers.updateGrant(this.grants, grant);
    } catch (error) {
      console.error('Error handling cancel grant event:', error);
      return false;
    }
  }
}
