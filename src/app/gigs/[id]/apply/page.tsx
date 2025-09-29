'use client';

import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading';
import { Textarea } from '@/components/ui/textarea';
import { customResolver } from '@/lib/form-validation';
import { useToast } from '@/lib/hooks/use-toast';
import { timestampToDatetimeLocal } from '@/lib/utils';
import { useAuth } from '@/store/auth';
import { useGigs } from '@/store/gigs';
import { gigUtils, type Gig } from '@/types/gig';
import { applyToGigSchema, gigValidationUtils } from '@/validators/gig';
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  DollarSign,
  ExternalLink,
  FileText,
  Plus,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';

interface ApplyPageProps {
  params: Promise<{
    id: string;
  }>;
}

type ApplicationFormData = z.infer<typeof applyToGigSchema>;

export default function ApplyPage({ params }: ApplyPageProps) {
  const { gigs, init, applyToGig } = useGigs();
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [gig, setGig] = useState<Gig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { id } = use(params);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (id && gigs.length > 0) {
      const foundGig = gigs.find((g) => g.id === id);
      setGig(foundGig || null);
      setIsLoading(false);
    } else if (id && gigs.length === 0) {
      // Still loading gigs
      setIsLoading(true);
    }
  }, [id, gigs]);

  // Set a timeout to stop loading after 60 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
      }
    }, 60 * 1000);

    return () => clearTimeout(timeout);
  }, [isLoading]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ApplicationFormData>({
    resolver: customResolver(applyToGigSchema),
    defaultValues: {
      portfolioLink: '',
      milestones: [
        {
          id: crypto.randomUUID(),
          amountSats: gig?.budgetRange?.minSats || 1000, // Default to 1000 sats if no budget
          description: '',
          eta: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days from now
        },
      ],
    },
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'milestones',
  });

  const watchedMilestones = watch('milestones');

  const totalMilestoneAmount =
    gigValidationUtils.calculateTotalMilestoneAmount(watchedMilestones);
  const isMilestoneSumValid = totalMilestoneAmount > 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner className="h-8 w-8 mb-4" />
          <h1 className="text-2xl font-bold mb-4">Loading Gig...</h1>
          <p className="text-muted-foreground mb-4">
            Fetching gig details from the network
          </p>
        </div>
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Gig not found</h1>
            <p className="text-muted-foreground mb-4">
              The gig you're looking for doesn't exist or has been removed.
            </p>
            <Link href="/gigs">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Gigs
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Authentication Required</h1>
            <p className="text-muted-foreground mb-4">
              You need to be logged in to apply to gigs.
            </p>
            <Button
              onClick={() => {
                const connectButton = document.querySelector(
                  '[data-connect-wallet]'
                ) as HTMLButtonElement;
                connectButton?.click();
              }}
              className="bg-blue-600 hover:from-blue-700 hover:to-purple-700"
            >
              Connect Nostr
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const canApply = gigUtils.canApply(gig);

  if (!canApply) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Applications Closed</h1>
            <p className="text-muted-foreground mb-4">
              This gig is no longer accepting applications.
            </p>
            <Link href={`/gigs/${gig.id}`}>
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Gig
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const addMilestone = () => {
    append({
      id: crypto.randomUUID(),
      amountSats: 1000, // Default to 1000 sats
      description: '',
      eta: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
  };

  const removeMilestone = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const onSubmit = async (data: ApplicationFormData) => {
    setIsSubmitting(true);
    try {
      await applyToGig({
        gigId: gig.id,
        portfolioLink: data.portfolioLink,
        offerAmountSats: totalMilestoneAmount, // Use calculated total
        milestones: data.milestones.map((m) => ({
          amountSats: m.amountSats,
          description: m.description,
          eta: m.eta,
        })),
      });
      toast({
        title: 'Application Submitted Successfully',
        description:
          'Your application has been sent to the gig sponsor for review.',
      });
      router.push(`/gigs/${gig.id}`);
    } catch (error) {
      console.error('Application failed:', error);
      toast({
        title: 'Failed to Submit Application',
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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/gigs/${gig.id}`}
            className={buttonVariants({
              variant: 'outline',
              className: 'p-0 mb-4',
            })}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Gig
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Apply to Gig</h1>
            <p className="text-muted-foreground">
              Submit your application and milestone breakdown
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Application Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Portfolio Link */}
              <div className="space-y-2">
                <Label htmlFor="portfolioLink">Portfolio Link (Optional)</Label>
                <div className="relative">
                  <ExternalLink className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="portfolioLink"
                    type="url"
                    placeholder="https://your-portfolio.com"
                    className="pl-10"
                    {...register('portfolioLink')}
                  />
                </div>
                {errors.portfolioLink && (
                  <p className="text-sm text-red-500">
                    {errors.portfolioLink.message}
                  </p>
                )}
              </div>

              {/* Total Offer Amount (Read-only) */}
              <div className="space-y-2">
                <Label>Total Offer Amount (sats)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    value={totalMilestoneAmount.toLocaleString()}
                    className="pl-10 bg-muted/50 cursor-not-allowed"
                    readOnly
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Automatically calculated from milestone amounts
                </p>
                {gig.budgetRange && (
                  <p className="text-sm text-muted-foreground">
                    {gigUtils.isSingleAmount(gig.budgetRange)
                      ? 'Budget: '
                      : 'Budget range: '}
                    {gigUtils.formatBudget(gig.budgetRange)}
                  </p>
                )}
              </div>

              {/* Milestones */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Milestones *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addMilestone}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Milestone
                  </Button>
                </div>

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="border rounded-lg p-4 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Milestone {index + 1}</h4>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMilestone(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`milestones.${index}.amountSats`}>
                            Amount (sats) *
                          </Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              placeholder="5000"
                              className="pl-10"
                              {...register(`milestones.${index}.amountSats`, {
                                valueAsNumber: true,
                              })}
                            />
                          </div>
                          {errors.milestones?.[index]?.amountSats && (
                            <p className="text-sm text-red-500">
                              {errors.milestones[index]?.amountSats?.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`milestones.${index}.eta`}>
                            ETA *
                          </Label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="datetime-local"
                              className="pl-10"
                              value={timestampToDatetimeLocal(
                                watch(`milestones.${index}.eta`)
                              )}
                              onChange={(e) => {
                                if (e.target.value) {
                                  // Create date in local timezone
                                  const localDate = new Date(e.target.value);
                                  setValue(
                                    `milestones.${index}.eta`,
                                    localDate.getTime()
                                  );
                                } else {
                                  setValue(`milestones.${index}.eta`, 0);
                                }
                              }}
                            />
                          </div>
                          {errors.milestones?.[index]?.eta && (
                            <p className="text-sm text-red-500">
                              {errors.milestones[index]?.eta?.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`milestones.${index}.description`}>
                          Description *
                        </Label>
                        <div className="relative">
                          <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Textarea
                            placeholder="Describe what will be delivered in this milestone..."
                            className="pl-10 min-h-[100px]"
                            {...register(`milestones.${index}.description`)}
                          />
                        </div>
                        {errors.milestones?.[index]?.description && (
                          <p className="text-sm text-red-500">
                            {errors.milestones[index]?.description?.message}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Milestone sum validation */}
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between text-sm">
                    <span>Total milestone amount:</span>
                    <span
                      className={`font-medium ${
                        isMilestoneSumValid ? 'text-green-600' : 'text-red-500'
                      }`}
                    >
                      {totalMilestoneAmount.toLocaleString()} sats
                    </span>
                  </div>
                  {!isMilestoneSumValid && (
                    <p className="text-sm text-red-500 mt-2">
                      Please add at least one milestone with a valid amount
                    </p>
                  )}
                </div>
              </div>

              {/* Submit buttons */}
              <div className="flex gap-3 pt-4">
                <Link href={`/gigs/${gig.id}`}>
                  <Button type="button" variant="outline" className="flex-1">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={isSubmitting || !isMilestoneSumValid}
                  className="flex-1 bg-blue-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            </form>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Gig Info */}
            <div className="p-4 border rounded-lg bg-muted/30">
              <h3 className="font-medium mb-2">{gig.title}</h3>
              <p className="text-muted-foreground mb-3">
                {gig.shortDescription}
              </p>
              <div
                className="rich-text-content mb-4"
                dangerouslySetInnerHTML={{ __html: gig.description }}
              />
              {gig.budgetRange && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <span>{gigUtils.formatBudget(gig.budgetRange)}</span>
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Application Tips
              </h3>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Break work into clear, measurable milestones</li>
                <li>• Set realistic timelines for each milestone</li>
                <li>• Be specific about deliverables</li>
                <li>• Include your portfolio if available</li>
                <li>• Price competitively within the budget range</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
