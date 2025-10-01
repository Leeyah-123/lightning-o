'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/lib/hooks/use-toast';
import { normalizeToNpub, truncateMiddle } from '@/lib/utils';
import { useAuth } from '@/store/auth';
import { useGrants } from '@/store/grants';
import { grantUtils, type Grant } from '@/types/grant';
import {
  ArrowLeft,
  Award,
  Calendar,
  CheckCircle,
  ExternalLink,
  Users,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';

interface ApplicationsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ApplicationsPage({ params }: ApplicationsPageProps) {
  const { grants, init, selectApplication } = useGrants();
  const { user } = useAuth();
  const { toast } = useToast();
  const [grant, setGrant] = useState<Grant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const { id } = use(params);

  // Check if user is the grant owner
  const isOwner = grant && user?.pubkey === grant.sponsorPubkey;

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

  const handleSelectApplication = async (applicationId: string) => {
    if (!isOwner || !grant) return;

    setIsProcessing(true);
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
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner className="h-8 w-8 mb-4" />
          <h1 className="text-2xl font-bold mb-4">Loading Applications...</h1>
          <p className="text-muted-foreground mb-4">
            Fetching grant applications from the network
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

  if (!isOwner) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            Only the grant creator can view applications.
          </p>
          <Link href={`/grants/${grant.id}`}>
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Grant
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const pendingApplications = grant.applications.filter(
    (app) => app.status === 'pending'
  );
  const selectedApplications = grant.applications.filter(
    (app) => app.status === 'selected'
  );
  const rejectedApplications = grant.applications.filter(
    (app) => app.status === 'rejected'
  );

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href={`/grants/${grant.id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Grant
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{grant.title}</h1>
            <p className="text-muted-foreground">Applications Management</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/20 mx-auto mb-2">
                <Calendar className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">
                {pendingApplications.length}
              </div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 mx-auto mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">
                {selectedApplications.length}
              </div>
              <div className="text-sm text-muted-foreground">Selected</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 mx-auto mb-2">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">
                {rejectedApplications.length}
              </div>
              <div className="text-sm text-muted-foreground">Rejected</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-6">
        {/* Pending Applications */}
        {pendingApplications.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-yellow-600" />
                Pending Applications ({pendingApplications.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingApplications.map((application) => (
                <div key={application.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">Application</span>
                        <Badge variant="warning">Pending Review</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        Applicant:{' '}
                        {truncateMiddle(
                          normalizeToNpub(application.applicantPubkey),
                          8
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Applied{' '}
                        {grantUtils.getRelativeTime(application.submittedAt)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleSelectApplication(application.id)}
                        size="sm"
                        className="bg-green-600 hover:from-green-700 hover:to-emerald-700"
                        disabled={isProcessing}
                      >
                        Select
                      </Button>
                      <Link
                        href={`/grants/${grant.id}/applications/${application.id}`}
                      >
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                      </Link>
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
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Portfolio
                    </a>
                  )}

                  {application.budgetRequest && (
                    <div className="mt-2">
                      <span className="text-sm font-medium">
                        Budget Request:{' '}
                        {application.budgetRequest.toLocaleString()} sats
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Selected Applications */}
        {selectedApplications.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Selected Applications ({selectedApplications.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedApplications.map((application) => (
                <div key={application.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">Application</span>
                        <Badge variant="success">Selected</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        Applicant:{' '}
                        {truncateMiddle(
                          normalizeToNpub(application.applicantPubkey),
                          8
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Selected{' '}
                        {application.selectedAt
                          ? grantUtils.getRelativeTime(application.selectedAt)
                          : 'Recently'}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/grants/${grant.id}/applications/${application.id}`}
                      >
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:from-blue-700 hover:to-cyan-700"
                        >
                          Manage Application
                        </Button>
                      </Link>
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
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Portfolio
                    </a>
                  )}

                  {application.finalAllocation && (
                    <div className="mt-2">
                      <span className="text-sm font-medium">
                        Final Allocation:{' '}
                        {application.finalAllocation.toLocaleString()} sats
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Rejected Applications */}
        {rejectedApplications.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                Rejected Applications ({rejectedApplications.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {rejectedApplications.map((application) => (
                <div key={application.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">Application</span>
                        <Badge variant="destructive">Rejected</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        Applicant:{' '}
                        {truncateMiddle(
                          normalizeToNpub(application.applicantPubkey),
                          8
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Applied{' '}
                        {grantUtils.getRelativeTime(application.submittedAt)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/grants/${grant.id}/applications/${application.id}`}
                      >
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                      </Link>
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
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Portfolio
                    </a>
                  )}

                  {application.rejectionReason && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <h5 className="font-medium text-red-800 dark:text-red-200 mb-1">
                        Rejection Reason:
                      </h5>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        {application.rejectionReason}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* No Applications */}
        {grant.applications.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No Applications Yet
              </h3>
              <p className="text-muted-foreground">
                This grant hasn&apos;t received any applications yet. Share it
                to get more visibility.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
