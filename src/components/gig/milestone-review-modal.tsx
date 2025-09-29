'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { customResolver } from '@/lib/form-validation';
import { useToast } from '@/lib/hooks/use-toast';
import { useGigs } from '@/store/gigs';
import { reviewMilestoneSchema } from '@/validators/gig';
import { CheckCircle, DollarSign, XCircle, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

interface MilestoneReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  gigId: string;
  milestoneId: string;
  milestoneAmount: number;
  milestoneDescription: string;
  submittedContent: string;
  submittedLightningAddress: string;
  submittedAt: number;
}

type ReviewFormData = z.infer<typeof reviewMilestoneSchema>;

export function MilestoneReviewModal({
  isOpen,
  onClose,
  gigId,
  milestoneId,
  milestoneAmount,
  milestoneDescription,
  submittedContent,
  submittedLightningAddress,
  submittedAt,
}: MilestoneReviewModalProps) {
  const router = useRouter();
  const { reviewMilestone } = useGigs();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<ReviewFormData>({
    resolver: customResolver(reviewMilestoneSchema),
    defaultValues: {
      action: 'approve',
      rejectionReason: '',
    },
    mode: 'onChange',
  });

  const watchedAction = watch('action');

  const onSubmit = async (data: ReviewFormData) => {
    setIsProcessing(true);
    try {
      await reviewMilestone({
        gigId,
        milestoneId,
        action: data.action,
        rejectionReason: data.rejectionReason,
      });

      toast({
        title:
          data.action === 'approve'
            ? 'Milestone Approved'
            : 'Milestone Rejected',
        description:
          data.action === 'approve'
            ? 'Payment has been sent to the talent.'
            : 'The talent has been notified and can resubmit.',
      });

      reset();
      onClose();
      router.refresh();
    } catch (error) {
      console.error('Review error:', error);
      toast({
        title: 'Failed to Review Milestone',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Review Milestone Submission"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Milestone Info */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-500" />
            <span className="font-medium">
              {milestoneAmount.toLocaleString()} sats
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {milestoneDescription}
          </p>
        </div>

        {/* Submitted Content */}
        <div className="space-y-2">
          <Label>Submitted Work</Label>
          <div className="p-4 border rounded-lg bg-muted/30">
            <div
              className="rich-text-content"
              dangerouslySetInnerHTML={{ __html: submittedContent }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Submitted on {formatDate(submittedAt)}
          </p>
        </div>

        {/* Payment Info */}
        <div className="space-y-2">
          <Label>Payment Address</Label>
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="font-mono text-sm">
              {submittedLightningAddress}
            </span>
          </div>
        </div>

        {/* Review Action */}
        <div className="space-y-4">
          <Label>Review Decision</Label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="radio"
                value="approve"
                {...register('action')}
                className="sr-only"
              />
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  watchedAction === 'approve'
                    ? 'border-green-500 bg-green-500'
                    : 'border-muted-foreground'
                }`}
              >
                {watchedAction === 'approve' && (
                  <CheckCircle className="w-3 h-3 text-white" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium text-green-600">Approve</div>
                <div className="text-sm text-muted-foreground">
                  Accept work and send payment
                </div>
              </div>
            </label>

            <label className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="radio"
                value="reject"
                {...register('action')}
                className="sr-only"
              />
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  watchedAction === 'reject'
                    ? 'border-red-500 bg-red-500'
                    : 'border-muted-foreground'
                }`}
              >
                {watchedAction === 'reject' && (
                  <XCircle className="w-3 h-3 text-white" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium text-red-600">Reject</div>
                <div className="text-sm text-muted-foreground">
                  Request changes or improvements
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Rejection Reason */}
        {watchedAction === 'reject' && (
          <div className="space-y-2">
            <Label htmlFor="rejectionReason">Rejection Reason *</Label>
            <Textarea
              id="rejectionReason"
              placeholder="Please explain what needs to be improved or changed..."
              className="min-h-[100px]"
              {...register('rejectionReason')}
            />
            {errors.rejectionReason && (
              <p className="text-sm text-red-500">
                {errors.rejectionReason.message}
              </p>
            )}
          </div>
        )}

        {/* Submit buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={
              isProcessing ||
              (watchedAction === 'reject' && !watch('rejectionReason')?.trim())
            }
            className={`flex-1 ${
              watchedAction === 'approve'
                ? 'bg-green-600 hover:from-green-700 hover:to-emerald-700'
                : 'bg-red-600 hover:from-red-700 hover:to-rose-700'
            }`}
          >
            {isProcessing
              ? 'Processing...'
              : watchedAction === 'approve'
              ? 'Approve & Pay'
              : 'Reject'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
