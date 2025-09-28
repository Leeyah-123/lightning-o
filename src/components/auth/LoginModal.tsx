'use client';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { customResolver } from '@/lib/formValidation';
import { useAuth } from '@/store/auth';
import { Key, Loader2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const loginSchema = z.object({
  secretKey: z.string().min(1, 'Secret key is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login, generateNewKeys } = useAuth();

  const form = useForm<LoginForm>({
    resolver: customResolver(loginSchema),
    defaultValues: { secretKey: '' },
  });

  const handleLogin = async (data: LoginForm) => {
    setIsLoggingIn(true);
    try {
      await login(data.secretKey);
      form.reset();
      onSuccess();
    } catch (error) {
      form.setError('secretKey', {
        message: error instanceof Error ? error.message : 'Login failed',
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGenerateKeys = async () => {
    setIsGenerating(true);
    try {
      generateNewKeys();
      onSuccess();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Connect with Nostr"
      className="max-w-md"
    >
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Key className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Welcome to Lightning</h3>
          <p className="text-sm text-muted-foreground">
            Connect your Nostr identity to start creating and funding bounties
          </p>
        </div>

        <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Your Secret Key (hex)
            </label>
            <Textarea
              placeholder="Enter your 64-character hex secret key..."
              rows={3}
              {...form.register('secretKey')}
              className="font-mono text-xs"
            />
            {form.formState.errors.secretKey && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.secretKey.message}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleGenerateKeys}
              disabled={isGenerating || isLoggingIn}
              className="flex-1"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              Generate New Keys
            </Button>
            <Button
              type="submit"
              disabled={isGenerating || isLoggingIn}
              className="flex-1"
            >
              {isLoggingIn ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Key className="h-4 w-4 mr-2" />
              )}
              Connect
            </Button>
          </div>
        </form>

        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2 text-sm">
            How to get your secret key:
          </h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Use a Nostr client like Damus, Amethyst, or Snort</li>
            <li>• Export your private key from settings</li>
            <li>• Or generate new keys if you're new to Nostr</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}
