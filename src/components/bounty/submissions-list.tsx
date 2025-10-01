'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LightningLinks } from '@/components/ui/lightning-links';
import { NostrAddress } from '@/components/ui/nostr-address';
import { Select } from '@/components/ui/select';
import type { BountySubmission } from '@/types/bounty';
import { Calendar, ChevronDown, ChevronUp, Clock, User } from 'lucide-react';
import { useState } from 'react';

interface SubmissionsListProps {
  submissions: BountySubmission[];
  bountyId: string;
  submissionDeadline: number;
  rewardSats: number | number[];
  onSelectWinners: (selectedIds: string[]) => void;
  isOwner: boolean;
  isProcessing: boolean;
  bountyStatus: 'pending' | 'open' | 'completed';
}

export function SubmissionsList({
  submissions,
  submissionDeadline,
  rewardSats,
  onSelectWinners,
  isOwner,
  isProcessing,
  bountyStatus,
}: Omit<SubmissionsListProps, 'bountyId'>) {
  const [selectedSubmissions, setSelectedSubmissions] = useState<string[]>([]);
  const [submissionRanks, setSubmissionRanks] = useState<
    Record<string, number>
  >({});
  const [expandedSubmission, setExpandedSubmission] = useState<string | null>(
    null
  );
  const [showAll, setShowAll] = useState(false);
  const [rankingError, setRankingError] = useState<string | null>(null);

  // Calculate maximum number of winners based on reward structure
  const maxWinners = Array.isArray(rewardSats) ? rewardSats.length : 1;

  // Check if submission deadline has passed
  const submissionDeadlinePassed = Date.now() >= submissionDeadline;

  // Filter out late submissions and those without lightning addresses
  const validSubmissions = submissions.filter((sub) => {
    const isOnTime = sub.submittedAt <= submissionDeadline;
    const hasLightningAddress =
      sub.lightningAddress && sub.lightningAddress.trim().length > 0;
    return isOnTime && hasLightningAddress;
  });

  const lateSubmissions = submissions.filter(
    (sub) => sub.submittedAt > submissionDeadline
  );
  const submissionsWithoutLightning = submissions.filter(
    (sub) => !sub.lightningAddress || sub.lightningAddress.trim().length === 0
  );

  const displaySubmissions = showAll
    ? validSubmissions
    : validSubmissions.slice(0, 5);

  const handleRankSubmission = (submissionId: string, rank: number | null) => {
    setRankingError(null);

    if (rank === null) {
      // Remove ranking
      const newRanks = { ...submissionRanks };
      delete newRanks[submissionId];
      setSubmissionRanks(newRanks);

      // Remove from selected submissions
      setSelectedSubmissions((prev) =>
        prev.filter((id) => id !== submissionId)
      );
      return;
    }

    // Check for duplicate rank
    const existingRank = Object.values(submissionRanks).find((r) => r === rank);
    if (existingRank) {
      setRankingError(`Rank ${rank} is already assigned to another submission`);
      return;
    }

    // Check if we're exceeding max winners
    if (
      Object.keys(submissionRanks).length >= maxWinners &&
      !submissionRanks[submissionId]
    ) {
      setRankingError(`Cannot select more than ${maxWinners} winner(s)`);
      return;
    }

    // Update ranking
    const newRanks = { ...submissionRanks };
    if (rank) {
      newRanks[submissionId] = rank;
    } else {
      delete newRanks[submissionId];
    }
    setSubmissionRanks(newRanks);

    // Update selected submissions
    const rankedSubmissions = Object.keys(newRanks);
    setSelectedSubmissions(rankedSubmissions);
  };

  const handleSelectWinners = () => {
    if (Object.keys(submissionRanks).length === 0) {
      setRankingError('Please select at least one winner');
      return;
    }

    // Validate all ranks are assigned
    const ranks = Object.values(submissionRanks);
    const hasDuplicates = ranks.length !== new Set(ranks).size;
    if (hasDuplicates) {
      setRankingError('Each submission must have a unique rank');
      return;
    }

    onSelectWinners(selectedSubmissions);
    setSelectedSubmissions([]);
    setSubmissionRanks({});
  };

  const toggleExpanded = (submissionId: string) => {
    setExpandedSubmission(
      expandedSubmission === submissionId ? null : submissionId
    );
  };

  const canSelectWinners =
    isOwner &&
    validSubmissions.length > 0 &&
    submissionDeadlinePassed &&
    bountyStatus !== 'completed';

  if (submissions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No submissions yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">
            Submissions ({validSubmissions.length})
          </CardTitle>
          {isOwner && canSelectWinners && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {Object.keys(submissionRanks).length} of {maxWinners} ranked
              </span>
              <Button
                onClick={handleSelectWinners}
                disabled={
                  isProcessing || Object.keys(submissionRanks).length === 0
                }
                variant="success"
                size="sm"
              >
                Select Winners
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {rankingError && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{rankingError}</p>
          </div>
        )}

        <div className="space-y-3">
          {displaySubmissions.map((submission, index) => (
            <div
              key={submission.id}
              className={`border rounded-lg p-4 transition-all ${
                submissionRanks[submission.id]
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium">
                      Submission #{index + 1}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {submission.status}
                    </Badge>
                    {submissionRanks[submission.id] && (
                      <Badge variant="secondary" className="text-xs">
                        {submissionRanks[submission.id]}
                        {submissionRanks[submission.id] === 1
                          ? 'st'
                          : submissionRanks[submission.id] === 2
                          ? 'nd'
                          : submissionRanks[submission.id] === 3
                          ? 'rd'
                          : 'th'}{' '}
                        Place
                      </Badge>
                    )}
                    {isOwner && canSelectWinners && (
                      <div className="flex items-center gap-2">
                        <Select
                          value={
                            submissionRanks[submission.id]?.toString() || ''
                          }
                          onChange={(e) =>
                            handleRankSubmission(
                              submission.id,
                              e.target.value ? parseInt(e.target.value) : null
                            )
                          }
                          className="w-32 h-8"
                        >
                          <option value="">No rank</option>
                          {Array.from(
                            { length: maxWinners },
                            (_, i) => i + 1
                          ).map((rank) => (
                            <option key={rank} value={rank.toString()}>
                              {rank}
                              {rank === 1
                                ? 'st'
                                : rank === 2
                                ? 'nd'
                                : rank === 3
                                ? 'rd'
                                : 'th'}{' '}
                              Place
                            </option>
                          ))}
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <NostrAddress pubkey={submission.pubkey} copy />
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(submission.submittedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <LightningLinks
                        address={submission.lightningAddress}
                        copy
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(submission.id)}
                      className="h-8 px-2"
                    >
                      {expandedSubmission === submission.id ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-1" />
                          Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-1" />
                          Show More
                        </>
                      )}
                    </Button>
                  </div>

                  {expandedSubmission === submission.id && (
                    <div className="mt-3 p-3 bg-muted/50 rounded-md">
                      <div
                        className="rich-text-content"
                        dangerouslySetInnerHTML={{ __html: submission.content }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {validSubmissions.length > 5 && (
            <div className="text-center pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAll(!showAll)}
                className="w-full"
              >
                {showAll
                  ? 'Show Less'
                  : `Show All ${validSubmissions.length} Submissions`}
              </Button>
            </div>
          )}

          {/* Show deadline status */}
          {isOwner && (
            <div className="mt-6 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">Judging Status</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {bountyStatus === 'completed' ? (
                  <span className="text-blue-600 dark:text-blue-400">
                    🏆 Winners have been announced! Judging is complete.
                  </span>
                ) : submissionDeadlinePassed ? (
                  <span className="text-green-600 dark:text-green-400">
                    ✓ Submission deadline has passed. You can now select
                    winners.
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">
                    ⏳ Submission deadline:{' '}
                    {new Date(submissionDeadline).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Show filtered out submissions info */}
          {(lateSubmissions.length > 0 ||
            submissionsWithoutLightning.length > 0) && (
            <div className="mt-6 p-4 bg-muted/30 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Filtered Submissions</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                {lateSubmissions.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>
                      {lateSubmissions.length} submission(s) submitted after
                      deadline
                    </span>
                  </div>
                )}
                {submissionsWithoutLightning.length > 0 && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>
                      {submissionsWithoutLightning.length} submission(s) without
                      Lightning address
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
