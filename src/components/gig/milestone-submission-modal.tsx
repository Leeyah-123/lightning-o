'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { customResolver } from '@/lib/form-validation';
import { useToast } from '@/lib/hooks/use-toast';
import { useGigs } from '@/store/gigs';
import { submitMilestoneSchema } from '@/validators/gig';
import { DollarSign, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

interface MilestoneSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  gigId: string;
  milestoneId: string;
  milestoneAmount: number;
  milestoneDescription: string;
}

type SubmissionFormData = z.infer<typeof submitMilestoneSchema>;

export function MilestoneSubmissionModal({
  isOpen,
  onClose,
  gigId,
  milestoneId,
  milestoneAmount,
  milestoneDescription,
}: MilestoneSubmissionModalProps) {
  const router = useRouter();
  const { submitMilestone } = useGigs();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<SubmissionFormData>({
    resolver: customResolver(submitMilestoneSchema),
    defaultValues: {
      content: '',
      lightningAddress: '',
    },
    mode: 'onChange',
  });

  const watchedContent = watch('content');

  const onSubmit = async (data: SubmissionFormData) => {
    setIsSubmitting(true);
    try {
      await submitMilestone({
        gigId,
        milestoneId,
        content: data.content,
        lightningAddress: data.lightningAddress,
      });

      toast({
        title: 'Milestone Submitted Successfully',
        description: 'Your work has been submitted for review by the sponsor.',
      });

      reset();
      onClose();
      router.refresh();
    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: 'Failed to Submit Milestone',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Submit Milestone">
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

        {/* Submission Content */}
        <div className="space-y-2">
          <Label htmlFor="content">Work Submission</Label>
          <RichTextEditor
            value={watchedContent}
            onChange={(value) => setValue('content', value)}
            placeholder="Describe the work completed for this milestone. Include any relevant details, links, or deliverables..."
            className="min-h-[200px]"
          />
          {errors.content && (
            <p className="text-sm text-red-500">{errors.content.message}</p>
          )}
        </div>

        {/* Lightning Address */}
        <div className="space-y-2">
          <Label htmlFor="lightningAddress">
            Lightning Address for Payment
          </Label>
          <div className="relative">
            <Zap className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="lightningAddress"
              type="text"
              placeholder="yourname@lightning.com"
              className="pl-10"
              {...register('lightningAddress')}
            />
          </div>
          {errors.lightningAddress && (
            <p className="text-sm text-red-500">
              {errors.lightningAddress.message}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            This is where you'll receive payment for this milestone
          </p>
        </div>

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
            disabled={isSubmitting || !watchedContent.trim()}
            className="flex-1 bg-green-600 hover:from-green-700 hover:to-emerald-700"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Milestone'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
