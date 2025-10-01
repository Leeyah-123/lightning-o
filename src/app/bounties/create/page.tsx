'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Textarea } from '@/components/ui/textarea';
import { customResolver } from '@/lib/form-validation';
import { useAuth } from '@/store/auth';
import { useBounties } from '@/store/bounties';
import {
  bountyCreateSchema,
  type BountyCreateInput,
} from '@/validators/bounty';
import { ArrowLeft, Plus, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

export default function CreateBountyPage() {
  const router = useRouter();
  const { createBounty } = useBounties();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    formState: { errors, isValid },
    handleSubmit,
    watch,
    setValue,
  } = useForm<BountyCreateInput>({
    resolver: customResolver(bountyCreateSchema),
    defaultValues: {
      title: '',
      shortDescription: '',
      description: `
      <h2>Bounty Title</h2>
      <p>Bounty description</p>
      <h3>Bounty requirements</h3>
      <ul>
        <li>Requirement 1</li>
        <li>Requirement 2</li>
        <li>Requirement 3</li>
      </ul>
      <h3>Bounty deliverables</h3>
      <ul>
        <li>Deliverable 1</li>
        <li>Deliverable 2</li>
        <li>Deliverable 3</li>
      </ul>
      `,
      rewardSats: [1000],
      submissionDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      judgingDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    },
    mode: 'onChange',
  });

  const onSubmit = async (data: BountyCreateInput) => {
    if (!user) {
      alert('Please log in to create a bounty');
      return;
    }

    setIsSubmitting(true);
    try {
      const bounty = await createBounty(data);
      router.push(`/bounties/${bounty.id}`);
    } catch (error) {
      console.error('Failed to create bounty:', error);
      alert('Failed to create bounty. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-muted-foreground mb-4">
            Please log in to create a bounty.
          </p>
          <Button onClick={() => router.push('/')}>Go to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => router.push('/bounties')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bounties
          </Button>
          <h1 className="text-3xl font-bold">Create New Bounty</h1>
          <p className="text-muted-foreground mt-2">
            Create a new bounty and publish it to the Nostr network.
          </p>
        </div>

        <form onSubmit={(e) => handleSubmit(onSubmit)(e)} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Bounty Title *
              </label>
              <Input
                placeholder="e.g., Build a React component for user authentication"
                {...register('title')}
                className="text-base"
              />
              {errors.title && (
                <p className="text-sm text-destructive mt-1">
                  {errors.title.message || 'Title is required'}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Short Description *
              </label>
              <Textarea
                placeholder="Brief summary of the bounty (at least 5 characters)..."
                rows={2}
                {...register('shortDescription')}
                className="resize-none"
              />
              {errors.shortDescription && (
                <p className="text-sm text-destructive mt-1">
                  {errors.shortDescription.message ||
                    'Short description is required'}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Detailed Description *
              </label>
              <RichTextEditor
                content={watch('description')}
                onChange={(content) => setValue('description', content)}
                placeholder="Describe the bounty requirements, deliverables, and any specific instructions in detail..."
              />
              <div className="text-xs text-muted-foreground mt-2">
                <strong>Sample description:</strong> Use{' '}
                <strong>bold text</strong> for important requirements,{' '}
                <em>italic text</em> for emphasis, and bullet points for
                deliverables:
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Create a responsive React component</li>
                  <li>Include proper TypeScript types</li>
                  <li>Add unit tests with Jest</li>
                  <li>Follow accessibility guidelines (WCAG 2.1)</li>
                </ul>
              </div>
              {errors.description && (
                <p className="text-sm text-destructive mt-1">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Reward Structure *
              </label>
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Set reward amounts for each tier (1st place, 2nd place, etc.)
                </p>

                <div className="space-y-2">
                  {(watch('rewardSats') as number[]).map((_, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Zap className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-500" />
                        <Input
                          type="number"
                          placeholder={`${index + 1}${
                            index === 0
                              ? 'st'
                              : index === 1
                              ? 'nd'
                              : index === 2
                              ? 'rd'
                              : 'th'
                          } place reward`}
                          value={(watch('rewardSats') as number[])[index] || ''}
                          onChange={(e) => {
                            const currentRewards = [
                              ...(watch('rewardSats') as number[]),
                            ];
                            currentRewards[index] =
                              parseInt(e.target.value) || 0;
                            setValue('rewardSats', currentRewards);
                          }}
                          className="pl-10"
                          min="1"
                        />
                      </div>
                      {(watch('rewardSats') as number[]).length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const currentRewards = [
                              ...(watch('rewardSats') as number[]),
                            ];
                            currentRewards.splice(index, 1);
                            setValue('rewardSats', currentRewards);
                          }}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const currentRewards = [
                      ...(watch('rewardSats') as number[]),
                    ];
                    currentRewards.push(100);
                    setValue('rewardSats', currentRewards);
                  }}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Reward Tier
                </Button>
              </div>
              {errors.rewardSats && (
                <p className="text-sm text-destructive mt-1">
                  {errors.rewardSats.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Submission Deadline *
                </label>
                <Input
                  type="datetime-local"
                  {...register('submissionDeadline', {
                    valueAsDate: true,
                  })}
                  min={new Date().toISOString().slice(0, 16)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  When submissions will close
                </p>
                {errors.submissionDeadline && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.submissionDeadline.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Judging Deadline *
                </label>
                <Input
                  type="datetime-local"
                  {...register('judgingDeadline', {
                    valueAsDate: true,
                  })}
                  min={new Date().toISOString().slice(0, 16)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  When judging will be completed
                </p>
                {errors.judgingDeadline && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.judgingDeadline.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">How it works:</h4>
            <ol className="text-sm text-muted-foreground space-y-1">
              <li>1. Create and publish your bounty to Nostr</li>
              <li>2. Fund the bounty with Lightning payment</li>
              <li>3. Wait for submissions and select winners</li>
              <li>4. Lightning payments are automatically sent to winners</li>
            </ol>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/bounties')}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isValid === false}
              className="flex-1 bg-blue-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner className="h-4 w-4 mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Bounty
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
