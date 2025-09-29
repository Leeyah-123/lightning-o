'use client';

import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { customResolver } from '@/lib/form-validation';
import { useToast } from '@/lib/hooks/use-toast';
import { profileService } from '@/services/profile-service';
import { useAuth } from '@/store/auth';
import { useGrants } from '@/store/grants';
import { grantUtils, type Grant } from '@/types/grant';
import { grantApplySchema, type GrantApplyInput } from '@/validators/grant';
import { ArrowLeft, Award, FileText } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

interface ApplyPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ApplyPage({ params }: ApplyPageProps) {
  const { grants, init, applyToGrant } = useGrants();
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [grant, setGrant] = useState<Grant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { id } = use(params);

  // Check if user is the grant owner
  const userHexPubkey = user?.pubkey
    ? profileService.getHexFromNpub(user.pubkey)
    : undefined;
  const isOwner = grant && userHexPubkey === grant.sponsorPubkey;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<GrantApplyInput>({
    resolver: customResolver(grantApplySchema),
    defaultValues: {
      portfolioLink: '',
      proposal: `
      <h2>Project Proposal</h2>
      <p>Describe your approach to this grant project.</p>
      <h3>Your Experience</h3>
      <p>Highlight relevant experience and skills.</p>
      <h3>Project Timeline</h3>
      <p>Outline your proposed timeline for completing the work.</p>
      <h3>Deliverables</h3>
      <p>Detail what you will deliver for each tranche.</p>
      `,
      budgetRequest: undefined,
    },
    mode: 'onChange',
  });

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (id && grants.length > 0) {
      const foundGrant = grants.find((g) => g.id === id);
      setGrant(foundGrant || null);
      setIsLoading(false);
    } else if (id && grants.length === 0) {
      // Still loading grants
      setIsLoading(true);
    }
  }, [id, grants]);

  // Redirect owners away from application page
  useEffect(() => {
    if (isOwner) {
      router.push(`/grants/${id}`);
    }
  }, [isOwner, router, id]);

  // Set a timeout to stop loading after 60 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
      }
    }, 60 * 1000);

    return () => clearTimeout(timeout);
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner className="h-8 w-8 mb-4" />
          <h1 className="text-2xl font-bold mb-4">Loading Grant...</h1>
          <p className="text-muted-foreground mb-4">
            Fetching grant details from the network
          </p>
        </div>
      </div>
    );
  }

  if (!grant) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Grant not found</h1>
          <p className="text-muted-foreground mb-4">
            The grant you&apos;re looking for doesn&apos;t exist or has been
            removed.
          </p>
          <Link href="/grants">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Grants
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-muted-foreground mb-4">
            Please connect your Nostr wallet to apply for this grant.
          </p>
          <Button onClick={() => router.push('/')}>Go to Home</Button>
        </div>
      </div>
    );
  }

  const canApply = grantUtils.canApply(grant);
  if (!canApply) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Applications Closed</h1>
          <p className="text-muted-foreground mb-4">
            This grant is no longer accepting applications.
          </p>
          <Link href={`/grants/${grant.id}`}>
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              View Grant Details
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: GrantApplyInput) => {
    if (isOwner) return;

    setIsSubmitting(true);
    try {
      await applyToGrant({
        grantId: grant.id,
        ...data,
      });

      toast({
        title: 'Application Submitted',
        description: 'Your application has been submitted successfully.',
      });

      router.push(`/grants/${grant.id}`);
    } catch (error) {
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
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/grants/${grant.id}`}
            className={buttonVariants({
              variant: 'outline',
              className: 'p-0 mb-4',
            })}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Grant
          </Link>
          <h1 className="text-3xl font-bold mb-2">Apply for Grant</h1>
          <p className="text-muted-foreground">
            Submit your application for &quot;{grant.title}&quot;
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Grant Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Grant Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">{grant.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {grant.shortDescription}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Funding
                    </span>
                    <span className="text-sm font-medium">
                      {grantUtils.formatReward(grant.reward)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Tranches
                    </span>
                    <span className="text-sm font-medium">
                      {grant.tranches.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Applications
                    </span>
                    <span className="text-sm font-medium">
                      {grant.applications.length}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Tranches</h4>
                  <div className="space-y-2">
                    {grant.tranches.map((tranche, index) => (
                      <div key={tranche.id} className="text-sm">
                        <div className="flex justify-between items-start">
                          <span className="font-medium">
                            Tranche {index + 1}
                          </span>
                          <span className="text-muted-foreground">
                            {grantUtils.formatTrancheAmount(tranche)}
                          </span>
                        </div>
                        <div
                          className="rich-text-content mt-1"
                          dangerouslySetInnerHTML={{
                            __html: tranche.description,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Application Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Application Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="portfolioLink">
                      Portfolio Link (Optional)
                    </Label>
                    <Input
                      id="portfolioLink"
                      {...register('portfolioLink')}
                      placeholder="https://your-portfolio.com"
                      className="mt-1"
                    />
                    {errors.portfolioLink && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.portfolioLink.message}
                      </p>
                    )}
                  </div>

                  {grant.reward.type === 'range' && (
                    <div>
                      <Label htmlFor="budgetRequest">
                        Budget Request (sats)
                      </Label>
                      <Input
                        id="budgetRequest"
                        type="number"
                        {...register('budgetRequest', {
                          valueAsNumber: true,
                        })}
                        placeholder="Enter your requested amount"
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Request between {grant.reward.amount.toLocaleString()}{' '}
                        and {grant.reward.maxAmount!.toLocaleString()} sats
                      </p>
                      {errors.budgetRequest && (
                        <p className="text-sm text-red-600 mt-1">
                          {errors.budgetRequest.message}
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <Label htmlFor="proposal">Project Proposal *</Label>
                    <div className="mt-1">
                      <RichTextEditor
                        content={watch('proposal')}
                        onChange={(content) => setValue('proposal', content)}
                        placeholder="Describe your approach, experience, timeline, and deliverables..."
                      />
                    </div>
                    {errors.proposal && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.proposal.message}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Submit */}
              <div className="flex justify-end gap-4">
                <Link href={`/grants/${grant.id}`}>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={isSubmitting || !isValid}
                  className="bg-green-600 hover:from-green-700 hover:to-emerald-700"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
