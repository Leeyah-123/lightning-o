'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/hooks/use-toast';
import { formatOrdinal } from '@/lib/utils';
import { profileService } from '@/services/profile-service';
import { useAuth } from '@/store/auth';
import { useGrants } from '@/store/grants';
import { grantUtils, type Grant } from '@/types/grant';
import {
  ArrowLeft,
  Award,
  Calendar,
  CheckCircle,
  DollarSign,
  ExternalLink,
  FileText,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';

interface GrantDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function GrantDetailPage({ params }: GrantDetailPageProps) {
  const { grants, init, selectApplication } = useGrants();
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [grant, setGrant] = useState<Grant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { id } = use(params);

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
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Grant not found</h1>
            <p className="text-muted-foreground mb-4">
              The grant you&apos;re looking for might still be loading from the
              network. This can happen if you just created the grant or
              refreshed the page.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => init()}>
                <Zap className="h-4 w-4 mr-2" />
                Retry Loading
              </Button>
              <Link href="/grants">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Grants
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const userHexPubkey = user?.pubkey
    ? profileService.getHexFromNpub(user.pubkey)
    : undefined;
  const isOwner = userHexPubkey === grant.sponsorPubkey;
  const hasUserApplied =
    userHexPubkey &&
    grant.applications.some(
      (app) =>
        profileService.getHexFromNpub(userHexPubkey) === app.applicantPubkey
    );
  const isUserSelected =
    userHexPubkey &&
    grant.selectedApplicationIds.some((appId) => {
      const application = grant.applications.find((app) => app.id === appId);
      return (
        application &&
        profileService.getHexFromNpub(userHexPubkey) ===
          application.applicantPubkey
      );
    });

  const displayStatus = grantUtils.getDisplayStatus(grant);
  const canApply =
    grantUtils.canApply(grant) &&
    !hasUserApplied &&
    !isUserSelected &&
    !isOwner;

  const handleApply = () => {
    if (!user) {
      const connectButton = document.querySelector(
        '[data-connect-wallet]'
      ) as HTMLButtonElement;
      connectButton?.click();
      return;
    }
    router.push(`/grants/${grant.id}/apply`);
  };

  const handleSelectApplication = async (applicationId: string) => {
    if (!isOwner) return;

    try {
      await selectApplication({
        grantId: grant.id,
        applicationId,
      });
      toast({
        title: 'Application Selected',
        description: 'The application has been selected successfully.',
      });
    } catch (error) {
      toast({
        title: 'Failed to Select Application',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    }
  };

  const getTrancheStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Calendar className="h-4 w-4 text-yellow-500" />;
      case 'funded':
        return <DollarSign className="h-4 w-4 text-green-500" />;
      case 'submitted':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link href="/grants">
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Grants
          </Button>
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <h1 className="text-3xl font-bold">{grant.title}</h1>
              <Badge variant={grantUtils.getStatusBadgeVariant(displayStatus)}>
                {grantUtils.getStatusText(displayStatus)}
              </Badge>
            </div>
            <p className="text-lg text-muted-foreground mb-4">
              {grant.shortDescription}
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                <span>{grantUtils.formatReward(grant.reward)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{grant.applications.length} applications</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{grantUtils.getRelativeTime(grant.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Grant Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="rich-text-content"
                dangerouslySetInnerHTML={{ __html: grant.description }}
              />
            </CardContent>
          </Card>

          {/* Tranches */}
          <Card>
            <CardHeader>
              <CardTitle>Tranches</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {grant.tranches.map((tranche, index) => (
                <div key={tranche.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">
                      {formatOrdinal(index + 1)} Tranche
                    </h4>
                    <div className="flex items-center gap-2">
                      {getTrancheStatusIcon(tranche.status)}
                      <span className="text-sm font-medium">
                        {grantUtils.formatTrancheAmount(tranche)}
                      </span>
                    </div>
                  </div>
                  <div
                    className="rich-text-content mb-3"
                    dangerouslySetInnerHTML={{ __html: tranche.description }}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Applications */}
          <Card>
            <CardHeader>
              <CardTitle>Applications ({grant.applications.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {grant.applications.slice(0, 5).map((application) => (
                <div key={application.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">Application</span>
                        {application.status === 'selected' && (
                          <Badge variant="success">Selected</Badge>
                        )}
                        {application.status === 'rejected' && (
                          <Badge variant="destructive">Rejected</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Applied{' '}
                        {grantUtils.getRelativeTime(application.submittedAt)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {isOwner && application.status === 'pending' && (
                        <Button
                          onClick={() =>
                            handleSelectApplication(application.id)
                          }
                          size="sm"
                          className="bg-green-600 hover:from-green-700 hover:to-emerald-700"
                        >
                          Select
                        </Button>
                      )}
                      {application.status === 'selected' && (
                        <Link
                          href={`/grants/${grant.id}/applications/${application.id}`}
                        >
                          <Button size="sm" variant="outline">
                            Manage Application
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>

                  <div
                    className="rich-text-content mb-3"
                    dangerouslySetInnerHTML={{ __html: application.proposal }}
                  />

                  {application.portfolioLink && (
                    <a
                      href={application.portfolioLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3 inline mr-1" />
                      Portfolio
                    </a>
                  )}
                </div>
              ))}

              {grant.applications.length > 5 && (
                <div className="text-center">
                  <Link href={`/grants/${grant.id}/applications`}>
                    <Button variant="outline">
                      View All Applications ({grant.applications.length})
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Apply Button */}
          {canApply && (
            <Card>
              <CardContent className="p-6 text-center">
                <Button
                  onClick={handleApply}
                  size="lg"
                  className="w-full bg-green-600 hover:from-green-700 hover:to-emerald-700"
                >
                  <Award className="h-5 w-5 mr-2" />
                  Apply for Grant
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Selected Applicant Status */}
          {isUserSelected && (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-green-600 dark:text-green-400">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                  <p className="font-medium">You&apos;ve been selected!</p>
                  <p className="text-sm">
                    {grant.tranches.some((t) => t.status === 'funded')
                      ? 'You can start working on funded tranches.'
                      : 'Awaiting sponsor payment for the first tranche.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Grant Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Grant Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Funding</span>
                <span className="font-medium">
                  {grantUtils.formatReward(grant.reward)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tranches</span>
                <span className="font-medium">{grant.tranches.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Applications</span>
                <span className="font-medium">{grant.applications.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Selected</span>
                <span className="font-medium">
                  {grant.selectedApplicationIds.length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
