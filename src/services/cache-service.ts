import { useCache } from '@/store/cache';
import { bountyService } from './bounty-service';
import { gigService } from './gig-service';
import { grantService } from './grant-service';
import { nostrService } from './nostr-service';

class CacheService {
  private retryCounts = {
    bounties: 0,
    gigs: 0,
    grants: 0,
  };

  private retryTimeouts = {
    bounties: null as NodeJS.Timeout | null,
    gigs: null as NodeJS.Timeout | null,
    grants: null as NodeJS.Timeout | null,
  };

  // Get or create system keys
  private async getOrCreateSystemKeys(): Promise<{ sk: string; pk: string }> {
    // Fetch system keys from server
    try {
      const response = await fetch('/api/system-keys');
      if (response.ok) {
        const { privateKey, publicKey } = await response.json();
        return { sk: privateKey, pk: publicKey };
      }
    } catch (error) {
      console.warn('Failed to fetch system keys from server:', error);
    }

    // Fallback: Generate new system keys locally
    return nostrService.generateKeys();
  }

  // Initialize all services with cache integration
  async initializeAll() {
    const cache = useCache.getState();

    // Get system keys first
    const systemKeys = await this.getOrCreateSystemKeys();

    // Set up change callbacks for each service
    bountyService.setOnChangeCallback(() => {
      const bounties = bountyService.list();
      cache.setBounties(bounties);
    });

    gigService.setOnChangeCallback(() => {
      const gigs = gigService.list();
      cache.setGigs(gigs);
    });

    grantService.setOnChangeCallback(() => {
      const grants = grantService.list();
      cache.setGrants(grants);
    });

    // Initialize services
    await Promise.all([
      this.initializeBounties(systemKeys),
      this.initializeGigs(systemKeys),
      this.initializeGrants(systemKeys),
    ]);
  }

  // Initialize bounties with caching
  async initializeBounties(systemKeys?: { sk: string; pk: string }) {
    const cache = useCache.getState();

    // If we have cached data and it's not stale, use it
    if (cache.bounties.length > 0 && !cache.isStale('bounties')) {
      console.log('Using cached bounties data');
      // Populate the service with cached data
      bountyService.populateFromCache(cache.bounties);
      return;
    }

    // If we're already loading, don't start another load
    if (cache.isLoading.bounties) {
      return;
    }

    try {
      cache.setLoading('bounties', true);
      cache.setError('bounties', null);

      // Set system keys if provided
      if (systemKeys) {
        bountyService.setSystemKeys(systemKeys);
      }

      // Initialize the service (this will trigger the onChangeCallback)
      bountyService.startWatchers();

      // Reset retry count on success
      this.retryCounts.bounties = 0;
    } catch (error) {
      console.error('Failed to initialize bounties:', error);
      cache.setError(
        'bounties',
        error instanceof Error ? error.message : 'Unknown error'
      );
      await this.handleRetry('bounties', () =>
        this.initializeBounties(systemKeys)
      );
    } finally {
      cache.setLoading('bounties', false);
    }
  }

  // Initialize gigs with caching
  async initializeGigs(systemKeys?: { sk: string; pk: string }) {
    const cache = useCache.getState();

    if (cache.gigs.length > 0 && !cache.isStale('gigs')) {
      console.log('Using cached gigs data');
      // Populate the service with cached data
      gigService.populateFromCache(cache.gigs);
      return;
    }

    if (cache.isLoading.gigs) {
      return;
    }

    try {
      cache.setLoading('gigs', true);
      cache.setError('gigs', null);

      // Set system keys if provided
      if (systemKeys) {
        gigService.setSystemKeys(systemKeys);
      }

      gigService.startWatchers();
      this.retryCounts.gigs = 0;
    } catch (error) {
      console.error('Failed to initialize gigs:', error);
      cache.setError(
        'gigs',
        error instanceof Error ? error.message : 'Unknown error'
      );
      await this.handleRetry('gigs', () => this.initializeGigs(systemKeys));
    } finally {
      cache.setLoading('gigs', false);
    }
  }

  // Initialize grants with caching
  async initializeGrants(systemKeys?: { sk: string; pk: string }) {
    const cache = useCache.getState();

    if (cache.grants.length > 0 && !cache.isStale('grants')) {
      console.log('Using cached grants data');
      // Populate the service with cached data
      grantService.populateFromCache(cache.grants);
      return;
    }

    if (cache.isLoading.grants) {
      return;
    }

    try {
      cache.setLoading('grants', true);
      cache.setError('grants', null);

      // Set system keys if provided
      if (systemKeys) {
        grantService.setSystemKeys(systemKeys);
      }

      grantService.startWatchers();
      this.retryCounts.grants = 0;
    } catch (error) {
      console.error('Failed to initialize grants:', error);
      cache.setError(
        'grants',
        error instanceof Error ? error.message : 'Unknown error'
      );
      await this.handleRetry('grants', () => this.initializeGrants(systemKeys));
    } finally {
      cache.setLoading('grants', false);
    }
  }

  // Handle retry logic with exponential backoff
  private async handleRetry(
    type: 'bounties' | 'gigs' | 'grants',
    retryFn: () => Promise<void>
  ) {
    const cache = useCache.getState();
    const retryCount = this.retryCounts[type];

    if (retryCount >= cache.cacheConfig.maxRetries) {
      console.error(`Max retries reached for ${type}`);
      return;
    }

    this.retryCounts[type]++;
    const delay = cache.cacheConfig.retryDelay * Math.pow(2, retryCount - 1);

    console.log(`Retrying ${type} in ${delay}ms (attempt ${retryCount})`);

    this.retryTimeouts[type] = setTimeout(async () => {
      try {
        await retryFn();
      } catch (error) {
        console.error(`Retry failed for ${type}:`, error);
      }
    }, delay);
  }

  // Force refresh all data
  async refreshAll() {
    const cache = useCache.getState();
    cache.clearAllCache();

    // Get system keys for refresh
    const systemKeys = await this.getOrCreateSystemKeys();

    await Promise.all([
      this.initializeBounties(systemKeys),
      this.initializeGigs(systemKeys),
      this.initializeGrants(systemKeys),
    ]);
  }

  // Force refresh specific data type
  async refresh(type: 'bounties' | 'gigs' | 'grants') {
    const cache = useCache.getState();
    cache.clearCache(type);

    // Get system keys for refresh
    const systemKeys = await this.getOrCreateSystemKeys();

    switch (type) {
      case 'bounties':
        await this.initializeBounties(systemKeys);
        break;
      case 'gigs':
        await this.initializeGigs(systemKeys);
        break;
      case 'grants':
        await this.initializeGrants(systemKeys);
        break;
    }
  }

  // Check if data needs refresh
  needsRefresh(type: 'bounties' | 'gigs' | 'grants'): boolean {
    const cache = useCache.getState();
    return cache.shouldRefresh(type);
  }

  // Get cached data with fallback
  getBounties() {
    const cache = useCache.getState();
    return cache.bounties;
  }

  getGigs() {
    const cache = useCache.getState();
    return cache.gigs;
  }

  getGrants() {
    const cache = useCache.getState();
    return cache.grants;
  }

  // Cleanup retry timeouts
  cleanup() {
    Object.values(this.retryTimeouts).forEach((timeout) => {
      if (timeout) {
        clearTimeout(timeout);
      }
    });
    this.retryTimeouts = {
      bounties: null,
      gigs: null,
      grants: null,
    };
  }
}

export const cacheService = new CacheService();
