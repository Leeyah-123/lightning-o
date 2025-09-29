'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useAuth } from '@/store/auth';
import { useBounties } from '@/store/bounties';
import { Loader2, Send } from 'lucide-react';
import { useState } from 'react';

interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  bountyId: string;
  bountyTitle: string;
}

export function SubmissionModal({
  isOpen,
  onClose,
  bountyId,
  bountyTitle,
}: SubmissionModalProps) {
  const { user } = useAuth();
  const { submitToBounty } = useBounties();
  const [content, setContent] = useState('');
  const [lightningAddress, setLightningAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      setError('Please enter your submission content');
      return;
    }

    if (!lightningAddress.trim()) {
      setError('Please enter your Lightning address for payment');
      return;
    }

    if (!user) {
      setError('You must be logged in to submit');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await submitToBounty(bountyId, content.trim(), lightningAddress.trim());
      setContent('');
      setLightningAddress('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setContent('');
      setLightningAddress('');
      setError(null);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Submit Solution
              </h2>
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Bounty: {bountyTitle}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Provide a detailed solution for this bounty. Be specific and
                include any relevant code, documentation, or examples.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="submission-content"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Your Solution *
                </label>
                <RichTextEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Describe your solution in detail..."
                  className="min-h-[200px]"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {content.replace(/<[^>]*>/g, '').length} characters
                </p>
              </div>

              <div>
                <label
                  htmlFor="lightning-address"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Lightning Address for Payment *
                </label>
                <Input
                  id="lightning-address"
                  type="text"
                  value={lightningAddress}
                  onChange={(e) => setLightningAddress(e.target.value)}
                  placeholder="yourname@domain.com"
                  disabled={isSubmitting}
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Enter your Lightning address where you&apos;ll receive payment
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isSubmitting || !content.trim() || !lightningAddress.trim()
                  }
                  className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Solution
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Modal>
  );
}
