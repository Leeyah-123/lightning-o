'use client';

import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/lib/hooks/use-toast';
import { normalizeToNpub, truncateMiddle } from '@/lib/utils';
import { profileService } from '@/services/profile-service';
import { useAuth } from '@/store/auth';
import { useGigs } from '@/store/gigs';
import { gigUtils } from '@/types/gig';
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  ExternalLink,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';

interface ApplicationsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ApplicationsPage({ params }: ApplicationsPageProps) {
  const { gigs, init, selectApplication } = useGigs();
  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSelecting, setIsSelecting] = useState<string | null>(null);
  const { id } = use(params);

  useEffect(() => {
    init();
    setIsInitialized(true);
  }, [init]);

  const gig = gigs.find((g) => g.id === id);

  if (!isInitialized) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Gig not found</h1>
          <p className="text-muted-foreground mb-4">
            The gig you&apos;re looking for doesn&apos;t exist or has been
            removed.
          </p>
          <Link href="/gigs">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Gigs
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const userHexPubkey = user?.pubkey
    ? profileService.getHexFromNpub(user.pubkey)
    : undefined;
  const isOwner = userHexPubkey === gig.sponsorPubkey;

  if (!isOwner) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            Only the gig creator can view applications.
          </p>
          <Link href={`/gigs/${gig.id}`}>
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Gig
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const displayStatus = gigUtils.getDisplayStatus(gig);
  const canSelectApplication = gigUtils.canSelectApplication(gig);

  const handleSelectApplication = async (applicationId: string) => {
    setIsSelecting(applicationId);
    try {
      await selectApplication({
        gigId: gig.id,
        applicationId,
      });
      toast.toast({
        title: 'Application Selected Successfully',
        description:
          'The talent has been notified and you can now fund the first milestone.',
        onOpenChange: () => {
          setIsSelecting(null);
        },
      });
      router.push(`/gigs/${gig.id}`);
    } catch (error) {
      toast.toast({
        title: 'Failed to Select Application',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
        onOpenChange: () => {
          setIsSelecting(null);
        },
      });
    } finally {
      setIsSelecting(null);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
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
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="text-muted-foreground">
            {gig.applications.length} application
            {gig.applications.length !== 1 ? 's' : ''} received
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={gigUtils.getStatusBadgeVariant(displayStatus)}
            className="flex items-center gap-1"
          >
            {gigUtils.getStatusText(displayStatus)}
          </Badge>
          {gig.selectedApplicationId && (
            <Badge variant="default" className="bg-green-600">
              Application Selected
            </Badge>
          )}
        </div>
      </div>

      {/* Applications List */}
      {gig.applications.length > 0 ? (
        <div className="space-y-6">
          {gig.applications.map((application, index) => (
            <Card
              key={application.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        Application #{index + 1}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Applied {formatDate(application.submittedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-lg font-bold text-green-600">
                        <DollarSign className="h-4 w-4" />
                        {application.offerAmountSats.toLocaleString()} sats
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {application.milestones.length} milestone
                        {application.milestones.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Portfolio Link */}
                {application.portfolioLink && (
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={application.portfolioLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      View Portfolio
                    </a>
                  </div>
                )}

                {/* Milestones */}
                <div className="space-y-3">
                  <h4 className="font-medium">Milestones</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {application.milestones.map((milestone, milestoneIndex) => (
                      <div key={milestone.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">
                            Milestone {milestoneIndex + 1}
                          </span>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-green-500" />
                            <span className="text-sm font-medium">
                              {milestone.amountSats.toLocaleString()} sats
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {milestone.description}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>ETA: {formatDate(milestone.eta)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Applicant Info */}
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Applicant:
                  </span>
                  <span className="text-sm font-mono">
                    {truncateMiddle(
                      normalizeToNpub(application.applicantPubkey),
                      8,
                      8
                    )}
                  </span>
                </div>

                {/* Action Button */}
                {canSelectApplication && !gig.selectedApplicationId && (
                  <div className="flex justify-end">
                    <Button
                      onClick={() => handleSelectApplication(application.id)}
                      disabled={isSelecting === application.id}
                      className="bg-green-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      {isSelecting === application.id ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Selecting...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Select Application
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {gig.selectedApplicationId === application.id && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      This application has been selected
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
          <p className="text-muted-foreground mb-4">
            Applications will appear here once people start applying to your
            gig.
          </p>
          <Link href={`/gigs/${gig.id}`}>
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Gig
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
