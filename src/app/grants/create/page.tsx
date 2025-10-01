'use client';

import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Textarea } from '@/components/ui/textarea';
import { customResolver } from '@/lib/form-validation';
import { useToast } from '@/lib/hooks/use-toast';
import { useAuth } from '@/store/auth';
import { useGrants } from '@/store/grants';
import {
  grantCreateSchema,
  grantValidationUtils,
  type GrantCreateInput,
} from '@/validators/grant';
import { ArrowLeft, DollarSign, Minus, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';

export default function CreateGrantPage() {
  const router = useRouter();
  const { createGrant } = useGrants();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<GrantCreateInput>({
    resolver: customResolver(grantCreateSchema),
    defaultValues: {
      title: '',
      shortDescription: '',
      description: `
      <h2>Grant Description</h2>
      <p>Description of the grant</p>
      <h3>Grant Requirements</h3>
      <ul>
        <li>Requirement 1</li>
        <li>Requirement 2</li>
        <li>Requirement 3</li>
      </ul>
      <h3>Grant Deliverables</h3>
      <ul>
        <li>Deliverable 1</li>
        <li>Deliverable 2</li>
        <li>Deliverable 3</li>
      </ul>
      `,
      reward: {
        type: 'fixed',
        amount: 100000,
        maxAmount: undefined,
      },
      tranches: [
        {
          amount: 100000,
          maxAmount: undefined,
          description: `
          <h2>Tranche 1</h2>
          <p>Description of tranche 1</p>
          `,
        },
      ],
    },
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'tranches',
  });

  const watchedReward = watch('reward');
  const watchedTranches = watch('tranches');

  const totalTrancheAmount =
    grantValidationUtils.calculateTotalTrancheAmount(watchedTranches);
  const isSingleAmount = grantValidationUtils.isSingleAmount(watchedReward);

  const onSubmit = async (data: GrantCreateInput) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please connect your Nostr wallet to create a grant.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const grant = await createGrant({
        ...data,
        tranches: data.tranches.map((t) => ({
          amount: t.amount,
          maxAmount: t.maxAmount,
          description: t.description,
        })),
      });

      toast({
        title: 'Grant Created Successfully',
        description:
          'Your grant has been published and is now accepting applications.',
      });

      router.push(`/grants/${grant.id}`);
    } catch (error) {
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
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
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
                  {...register('title')}
                  placeholder="e.g., Build a Lightning-powered marketplace"
                  className="mt-1"
                />
                {errors.title && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="shortDescription">Short Description *</Label>
                <Textarea
                  id="shortDescription"
                  {...register('shortDescription')}
                  placeholder="Brief description of what you're looking for..."
                  className="mt-1"
                  rows={3}
                />
                {errors.shortDescription && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.shortDescription.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Detailed Description *</Label>
                <div className="mt-1">
                  <RichTextEditor
                    content={watch('description')}
                    onChange={(content) => setValue('description', content)}
                    placeholder="Describe the project in detail, including goals, requirements, and expectations..."
                  />
                </div>
                {errors.description && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.description.message}
                  </p>
                )}
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
                      {...register('reward.type')}
                      className="rounded"
                    />
                    <span>Fixed Amount</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="range"
                      {...register('reward.type')}
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
                    {...register('reward.amount', { valueAsNumber: true })}
                    placeholder="100000"
                    className="mt-1"
                  />
                  {errors.reward?.amount && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.reward.amount.message}
                    </p>
                  )}
                </div>
                {watchedReward.type === 'range' && (
                  <div>
                    <Label htmlFor="maxAmount">Maximum Amount (sats) *</Label>
                    <Input
                      id="maxAmount"
                      type="number"
                      {...register('reward.maxAmount', {
                        valueAsNumber: true,
                      })}
                      placeholder="500000"
                      className="mt-1"
                    />
                    {errors.reward?.maxAmount && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.reward.maxAmount.message}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {isSingleAmount && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Total reward:{' '}
                    <span className="font-medium">
                      {watchedReward.amount.toLocaleString()} sats
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
              {fields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Tranche {index + 1}</h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => remove(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor={`tranche-${field.id}-amount`}>
                        Amount (sats)
                      </Label>
                      <Input
                        id={`tranche-${field.id}-amount`}
                        type="number"
                        {...register(`tranches.${index}.amount`, {
                          valueAsNumber: true,
                        })}
                        placeholder="25000"
                      />
                      {errors.tranches?.[index]?.amount && (
                        <p className="text-sm text-red-600 mt-1">
                          {errors.tranches[index]?.amount?.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor={`tranche-${field.id}-maxAmount`}>
                        Max Amount (sats) - Optional
                      </Label>
                      <Input
                        id={`tranche-${field.id}-maxAmount`}
                        type="number"
                        {...register(`tranches.${index}.maxAmount`, {
                          valueAsNumber: true,
                        })}
                        placeholder="30000"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Leave empty for fixed amount
                      </p>
                      {errors.tranches?.[index]?.maxAmount && (
                        <p className="text-sm text-red-600 mt-1">
                          {errors.tranches[index]?.maxAmount?.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor={`tranche-${field.id}-description`}>
                        Description
                      </Label>
                      <div className="mt-1">
                        <RichTextEditor
                          content={watch(`tranches.${index}.description`)}
                          onChange={(content) =>
                            setValue(`tranches.${index}.description`, content)
                          }
                          placeholder="What should be delivered in this tranche?"
                        />
                      </div>
                      {errors.tranches?.[index]?.description && (
                        <p className="text-sm text-red-600 mt-1">
                          {errors.tranches[index]?.description?.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  append({
                    amount: 0,
                    maxAmount: undefined,
                    description: `
                      <h2>Tranche ${fields.length + 1}</h2>
                      <p>Description of tranche ${fields.length + 1}</p>
                      `,
                  })
                }
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
                {errors.tranches && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.tranches.message}
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
              disabled={isSubmitting || !isValid}
              className="bg-green-600 hover:from-green-700 hover:to-emerald-700"
            >
              {isSubmitting ? 'Creating...' : 'Create Grant'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
