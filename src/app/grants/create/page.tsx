'use client';

import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/lib/hooks/use-toast';
import { useAuth } from '@/store/auth';
import { useGrants } from '@/store/grants';
import { ArrowLeft, DollarSign, Minus, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Tranche {
  id: string;
  amountSats: number;
  description: string;
}

export default function CreateGrantPage() {
  const router = useRouter();
  const { createGrant } = useGrants();
  const { user } = useAuth();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [rewardType, setRewardType] = useState<'fixed' | 'range'>('fixed');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [tranches, setTranches] = useState<Tranche[]>([
    { id: '1', amountSats: 0, description: '' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddTranche = () => {
    const newTranche: Tranche = {
      id: Date.now().toString(),
      amountSats: 0,
      description: '',
    };
    setTranches([...tranches, newTranche]);
  };

  const handleRemoveTranche = (id: string) => {
    if (tranches.length > 1) {
      setTranches(tranches.filter((t) => t.id !== id));
    }
  };

  const handleTrancheChange = (
    id: string,
    field: keyof Tranche,
    value: string | number
  ) => {
    setTranches(
      tranches.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const totalTrancheAmount = tranches.reduce((sum, t) => sum + t.amountSats, 0);
  const isSingleAmount =
    rewardType === 'fixed' ||
    (rewardType === 'range' && minAmount === maxAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please connect your Nostr wallet to create a grant.',
        variant: 'destructive',
      });
      return;
    }

    if (!title.trim() || !shortDescription.trim() || !description.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    if (!minAmount || isNaN(Number(minAmount)) || Number(minAmount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid minimum amount.',
        variant: 'destructive',
      });
      return;
    }

    if (
      rewardType === 'range' &&
      (!maxAmount ||
        isNaN(Number(maxAmount)) ||
        Number(maxAmount) <= Number(minAmount))
    ) {
      toast({
        title: 'Invalid Range',
        description:
          'Please enter a valid maximum amount greater than the minimum.',
        variant: 'destructive',
      });
      return;
    }

    if (tranches.some((t) => !t.description.trim() || t.amountSats <= 0)) {
      toast({
        title: 'Invalid Tranches',
        description: 'Please fill in all tranche descriptions and amounts.',
        variant: 'destructive',
      });
      return;
    }

    const totalAmount =
      rewardType === 'fixed' ? Number(minAmount) : Number(maxAmount);
    if (totalTrancheAmount !== totalAmount) {
      toast({
        title: 'Tranche Mismatch',
        description: `Total tranche amount (${totalTrancheAmount.toLocaleString()} sats) must equal the total reward amount (${totalAmount.toLocaleString()} sats).`,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createGrant({
        title: title.trim(),
        shortDescription: shortDescription.trim(),
        description: description.trim(),
        reward: {
          type: rewardType,
          amount: Number(minAmount),
          maxAmount: rewardType === 'range' ? Number(maxAmount) : undefined,
        },
        tranches: tranches.map((t) => ({
          amountSats: t.amountSats,
          description: t.description.trim(),
        })),
      });

      toast({
        title: 'Grant Created Successfully',
        description:
          'Your grant has been published and is now accepting applications.',
      });

      router.push('/grants');
    } catch (error) {
      console.error('Failed to create grant:', error);
      toast({
        title: 'Failed to Create Grant',
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

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/grants"
              className={buttonVariants({
                variant: 'outline',
                className: 'p-0 mb-4',
              })}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Grants
            </Link>
            <h1 className="text-3xl font-bold mb-2">Create a Grant</h1>
            <p className="text-muted-foreground">
              Fund innovative projects and ideas with milestone-based Lightning
              payments.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Grant Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="title">Grant Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Build a Lightning-powered marketplace"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="shortDescription">Short Description *</Label>
                  <Textarea
                    id="shortDescription"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder="Brief description of what you're looking for..."
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Detailed Description *</Label>
                  <div className="mt-1">
                    <RichTextEditor
                      content={description}
                      onChange={setDescription}
                      placeholder="Describe the project in detail, including goals, requirements, and expectations..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reward Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Reward Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Reward Type</Label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="fixed"
                        checked={rewardType === 'fixed'}
                        onChange={(e) =>
                          setRewardType(e.target.value as 'fixed' | 'range')
                        }
                        className="rounded"
                      />
                      <span>Fixed Amount</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="range"
                        checked={rewardType === 'range'}
                        onChange={(e) =>
                          setRewardType(e.target.value as 'fixed' | 'range')
                        }
                        className="rounded"
                      />
                      <span>Range (Min - Max)</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minAmount">Minimum Amount (sats) *</Label>
                    <Input
                      id="minAmount"
                      type="number"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      placeholder="100000"
                      className="mt-1"
                    />
                  </div>
                  {rewardType === 'range' && (
                    <div>
                      <Label htmlFor="maxAmount">Maximum Amount (sats) *</Label>
                      <Input
                        id="maxAmount"
                        type="number"
                        value={maxAmount}
                        onChange={(e) => setMaxAmount(e.target.value)}
                        placeholder="500000"
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>

                {isSingleAmount && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Total reward:{' '}
                      <span className="font-medium">
                        {Number(minAmount).toLocaleString()} sats
                      </span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tranches */}
            <Card>
              <CardHeader>
                <CardTitle>Tranches (Milestone Payments)</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Define how the reward will be distributed across milestones.
                  Total must equal the reward amount.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {tranches.map((tranche, index) => (
                  <div
                    key={tranche.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Tranche {index + 1}</h4>
                      {tranches.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveTranche(tranche.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`tranche-${tranche.id}-amount`}>
                          Amount (sats)
                        </Label>
                        <Input
                          id={`tranche-${tranche.id}-amount`}
                          type="number"
                          value={tranche.amountSats}
                          onChange={(e) =>
                            handleTrancheChange(
                              tranche.id,
                              'amountSats',
                              Number(e.target.value)
                            )
                          }
                          placeholder="25000"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`tranche-${tranche.id}-description`}>
                          Description
                        </Label>
                        <Input
                          id={`tranche-${tranche.id}-description`}
                          value={tranche.description}
                          onChange={(e) =>
                            handleTrancheChange(
                              tranche.id,
                              'description',
                              e.target.value
                            )
                          }
                          placeholder="What should be delivered in this tranche?"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTranche}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Tranche
                </Button>

                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Total Tranche Amount:
                    </span>
                    <span className="font-medium">
                      {totalTrancheAmount.toLocaleString()} sats
                    </span>
                  </div>
                  {totalTrancheAmount !==
                    (rewardType === 'fixed'
                      ? Number(minAmount)
                      : Number(maxAmount)) && (
                    <p className="text-sm text-red-600 mt-1">
                      Must equal total reward amount
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex justify-end gap-4">
              <Link href="/grants">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-green-600 hover:from-green-700 hover:to-emerald-700"
              >
                {isSubmitting ? 'Creating...' : 'Create Grant'}
              </Button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
