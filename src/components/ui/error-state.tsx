'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An error occurred while loading data. Please try again.',
  onRetry,
  retryLabel = 'Try Again',
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 ${className}`}
    >
      <div className="text-center max-w-md">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 mx-auto mb-4">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>

        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>

        <p className="text-muted-foreground mb-6">{message}</p>

        {onRetry && (
          <Button
            onClick={onRetry}
            variant="outline"
            className="inline-flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {retryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

interface PageErrorStateProps {
  type: 'bounties' | 'gigs' | 'grants';
  onRetry?: () => void;
  className?: string;
}

export function PageErrorState({
  type,
  onRetry,
  className,
}: PageErrorStateProps) {
  const getTypeSpecificContent = () => {
    switch (type) {
      case 'bounties':
        return {
          title: 'Failed to load bounties',
          message:
            "We couldn't fetch the bounties data. This might be due to a network issue or server problem.",
        };
      case 'gigs':
        return {
          title: 'Failed to load gigs',
          message:
            "We couldn't fetch the gigs data. This might be due to a network issue or server problem.",
        };
      case 'grants':
        return {
          title: 'Failed to load grants',
          message:
            "We couldn't fetch the grants data. This might be due to a network issue or server problem.",
        };
      default:
        return {
          title: 'Failed to load data',
          message:
            "We couldn't fetch the data. This might be due to a network issue or server problem.",
        };
    }
  };

  const { title, message } = getTypeSpecificContent();

  return (
    <ErrorState
      title={title}
      message={message}
      onRetry={onRetry}
      retryLabel={`Retry ${type}`}
      className={className}
    />
  );
}
