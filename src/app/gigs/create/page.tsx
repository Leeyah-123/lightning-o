'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { customResolver } from '@/lib/form-validation';
import { useToast } from '@/lib/hooks/use-toast';
import { useGigs } from '@/store/gigs';
import { gigUtils } from '@/types/gig';
import { createGigSchema } from '@/validators/gig';
import { DollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

type CreateGigFormData = z.infer<typeof createGigSchema>;

export default function CreateGigPage() {
  const router = useRouter();
  const { createGig } = useGigs();
  const toast = useToast();
  const [isCreating, setIsCreating] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<CreateGigFormData>({
    resolver: customResolver(createGigSchema),
    defaultValues: {
      title: '',
      shortDescription: '',
      description: `
      <h2>Gig Title</h2>
      <p>Gig Description</p>
      <h3>Gig Requirements</h3>
      <ul>
        <li>Requirement 1</li>
        <li>Requirement 2</li>
        <li>Requirement 3</li>
      </ul>
      <h3>Gig Deliverables</h3>
      <ul>
        <li>Deliverable 1</li>
        <li>Deliverable 2</li>
        <li>Deliverable 3</li>
      </ul>
      `,
      budgetRange: {
        minSats: 0,
        maxSats: 0,
      },
    },
    mode: 'onChange',
  });

  const watchedDescription = watch('description');
  const watchedBudgetRange = watch('budgetRange');

  const onSubmit = async (data: CreateGigFormData) => {
    setIsCreating(true);
    try {
      await createGig(data);
      toast.toast({
        title: 'Gig Created Successfully',
        description:
          'Your gig has been published and is now visible to talents.',
        onOpenChange: () => {
          reset();
        },
      });
      reset();
      router.push('/gigs');
    } catch (error) {
      console.error('Gig creation error:', error);
      toast.toast({
        title: 'Failed to Create Gig',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
        onOpenChange: () => {
          setIsCreating(false);
        },
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="p-0 mb-4"
        >
          ← Back
        </Button>
        <div className="flex items-center gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold">Create New Gig</h1>
            <p className="text-muted-foreground">
              Post a gig opportunity and find talented people to work with
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Gig Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Gig Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Build a React Dashboard for Analytics"
                {...register('title')}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
              <p className="text-sm text-muted-foreground">
                A clear, concise title that describes what you need done.
              </p>
            </div>

            {/* Short Description */}
            <div className="space-y-2">
              <Label htmlFor="shortDescription">Short Description *</Label>
              <Input
                id="shortDescription"
                placeholder="e.g., Need a skilled React developer to build a modern analytics dashboard with real-time data visualization and user authentication."
                {...register('shortDescription')}
              />
              {errors.shortDescription && (
                <p className="text-sm text-red-500">
                  {errors.shortDescription.message}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                A brief summary that will appear in gig listings. 20-200
                characters.
              </p>
            </div>

            {/* Gig Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Detailed Description *</Label>
              <RichTextEditor
                value={watchedDescription}
                onChange={(value) => setValue('description', value)}
                placeholder="Describe the work you need done. Be specific about requirements, deliverables, and any other important details..."
                className="min-h-[200px]"
              />
              {errors.description && (
                <p className="text-sm text-red-500">
                  {errors.description.message}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Minimum 50 characters. Be clear and detailed to attract quality
                applicants.
              </p>
            </div>

            {/* Budget Range */}
            <div className="space-y-4">
              <Label>Budget (Optional)</Label>
              <p className="text-sm text-muted-foreground">
                Set your budget to help applicants understand your expectations.
                This is optional but recommended. The min and max should be the
                same if you want a single amount.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minSats">Minimum (sats)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="minSats"
                      type="number"
                      placeholder="1000"
                      className="pl-10"
                      {...register('budgetRange.minSats', {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                  {errors.budgetRange?.minSats && (
                    <p className="text-sm text-red-500">
                      {errors.budgetRange.minSats.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxSats">Maximum (sats)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="maxSats"
                      type="number"
                      placeholder="5000"
                      className="pl-10"
                      {...register('budgetRange.maxSats', {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                  {errors.budgetRange?.maxSats && (
                    <p className="text-sm text-red-500">
                      {errors.budgetRange.maxSats.message}
                    </p>
                  )}
                </div>
              </div>

              {errors.budgetRange && (
                <p className="text-sm text-red-500">
                  {errors.budgetRange.message}
                </p>
              )}

              {watchedBudgetRange &&
                !!Number(watchedBudgetRange?.minSats) &&
                !!Number(watchedBudgetRange?.maxSats) && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      {gigUtils.isSingleAmount(watchedBudgetRange)
                        ? 'Budget: '
                        : 'Budget range: '}
                      {gigUtils.formatBudget(watchedBudgetRange)}
                    </p>
                  </div>
                )}
            </div>

            {/* Submit buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating || !watchedDescription.trim()}
                className="flex-1 bg-blue-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isCreating ? 'Creating...' : 'Create Gig'}
              </Button>
            </div>
          </form>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Info Box */}
          <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              How Gigs Work
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>
                • Applicants will submit proposals with milestone breakdowns
              </li>
              <li>• You can review and select the best application</li>
              <li>
                • Work is completed in milestones with payments after each
                approval
              </li>
              <li>
                • You can cancel the gig anytime before selecting an application
              </li>
            </ul>
          </div>

          {/* Tips */}
          <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
            <h3 className="font-medium text-green-900 dark:text-green-100 mb-2">
              Tips for Success
            </h3>
            <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
              <li>• Be specific about deliverables and requirements</li>
              <li>• Set a realistic budget range</li>
              <li>• Include any technical specifications</li>
              <li>• Mention preferred timeline or deadlines</li>
              <li>• Be clear about communication expectations</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
