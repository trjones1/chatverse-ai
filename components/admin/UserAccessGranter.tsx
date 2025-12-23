// components/admin/UserAccessGranter.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AccessResult {
  success: boolean;
  action: string;
  result: any;
}

const characters = [
  { key: 'lexi', name: 'Lexi' },
  { key: 'nyx', name: 'Nyx' },
  { key: 'dom', name: 'Dominic' },
  { key: 'aiko', name: 'Aiko' },
  { key: 'chase', name: 'Chase' },
  { key: 'zaria', name: 'Zaria' },
  { key: 'chloe', name: 'Chloe' },
  { key: 'nova', name: 'Nova' },
  { key: 'ethan', name: 'Ethan' },
  { key: 'jayden', name: 'Jayden' },
  { key: 'miles', name: 'Miles' }
];

export default function UserAccessGranter() {
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [character, setCharacter] = useState('lexi');
  const [action, setAction] = useState('grant_subscription');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AccessResult | null>(null);

  // Form data for different actions
  const [subscriptionTier, setSubscriptionTier] = useState('sfw');
  const [durationMonths, setDurationMonths] = useState(1);
  const [creditAmount, setCreditAmount] = useState(100);
  const [creditBalance, setCreditBalance] = useState(0);

  const executeAction = async () => {
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      let actionData = {};

      switch (action) {
        case 'grant_subscription':
          actionData = {
            tier: subscriptionTier,
            duration_months: durationMonths
          };
          break;
        case 'add_voice_credits':
          actionData = {
            credits: creditAmount
          };
          break;
        case 'set_voice_credits':
          actionData = {
            balance: creditBalance
          };
          break;
        case 'revoke_subscription':
          // No additional data needed
          break;
      }

      const response = await fetch('/api/admin/user-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          email: email.trim(),
          character: character,
          action: action,
          data: actionData
        })
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to execute action');
      }

      setResult(responseData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getActionDescription = () => {
    switch (action) {
      case 'grant_subscription':
        return `Grant ${subscriptionTier.toUpperCase()} subscription for ${durationMonths} month(s)`;
      case 'revoke_subscription':
        return 'Revoke active subscription';
      case 'add_voice_credits':
        return `Add ${creditAmount} voice credits to account`;
      case 'set_voice_credits':
        return `Set voice credits balance to ${creditBalance}`;
      default:
        return 'Unknown action';
    }
  };

  const getActionColor = () => {
    switch (action) {
      case 'grant_subscription':
        return 'bg-green-600 hover:bg-green-700';
      case 'revoke_subscription':
        return 'bg-red-600 hover:bg-red-700';
      case 'add_voice_credits':
        return 'bg-blue-600 hover:bg-blue-700';
      case 'set_voice_credits':
        return 'bg-purple-600 hover:bg-purple-700';
      default:
        return 'bg-gray-600 hover:bg-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">User Access Granter</h3>
        <p className="text-sm text-gray-600 mb-4">
          Grant or revoke user access to subscriptions and voice credits. All actions are logged for audit purposes.
          <span className="block mt-1 text-xs text-orange-600">
            ℹ️ Admin-granted subscriptions are excluded from revenue analytics and marked as test accounts.
          </span>
        </p>
      </div>

      {/* User Input Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              User Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label htmlFor="character" className="block text-sm font-medium text-gray-700 mb-2">
              Character
            </label>
            <select
              id="character"
              value={character}
              onChange={(e) => setCharacter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {characters.map((char) => (
                <option key={char.key} value={char.key}>
                  {char.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="action" className="block text-sm font-medium text-gray-700 mb-2">
            Action
          </label>
          <select
            id="action"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="grant_subscription">Grant Subscription</option>
            <option value="revoke_subscription">Revoke Subscription</option>
            <option value="add_voice_credits">Add Voice Credits</option>
            <option value="set_voice_credits">Set Voice Credits Balance</option>
          </select>
        </div>

        {/* Action-specific form fields */}
        {action === 'grant_subscription' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-green-50 rounded-lg">
            <div>
              <label htmlFor="tier" className="block text-sm font-medium text-gray-700 mb-2">
                Subscription Tier
              </label>
              <select
                id="tier"
                value={subscriptionTier}
                onChange={(e) => setSubscriptionTier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="sfw">SFW Premium ($9.99)</option>
                <option value="nsfw">NSFW Premium ($34.99)</option>
              </select>
            </div>

            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                Duration (months)
              </label>
              <input
                type="number"
                id="duration"
                min="1"
                max="12"
                value={durationMonths}
                onChange={(e) => setDurationMonths(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>
        )}

        {action === 'add_voice_credits' && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <label htmlFor="credits" className="block text-sm font-medium text-gray-700 mb-2">
              Credits to Add
            </label>
            <input
              type="number"
              id="credits"
              min="1"
              max="10000"
              value={creditAmount}
              onChange={(e) => setCreditAmount(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

        {action === 'set_voice_credits' && (
          <div className="p-4 bg-purple-50 rounded-lg">
            <label htmlFor="balance" className="block text-sm font-medium text-gray-700 mb-2">
              New Balance (this will reset earned/spent counters)
            </label>
            <input
              type="number"
              id="balance"
              min="0"
              max="50000"
              value={creditBalance}
              onChange={(e) => setCreditBalance(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        )}

        {action === 'revoke_subscription' && (
          <div className="p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-red-800">
              <strong>Warning:</strong> This will cancel the user's active subscription for the selected character.
              The subscription will remain active until the current period ends.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            <strong>Action Preview:</strong> {getActionDescription()}
          </div>
          <button
            onClick={executeAction}
            disabled={isLoading}
            className={`px-6 py-2 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${getActionColor()}`}
          >
            {isLoading ? 'Processing...' : 'Execute Action'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800 text-sm">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Success Result Display */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-green-900 mb-4">
            ✅ Action Completed Successfully
          </h4>
          
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-600">Action:</span>
              <div className="text-sm text-gray-800 font-semibold">{result.action}</div>
            </div>

            {result.result.subscription && (
              <div>
                <span className="text-sm font-medium text-gray-600">Subscription Details:</span>
                <div className="text-sm text-gray-800 bg-white p-3 rounded border mt-1">
                  <div><strong>Tier:</strong> {result.result.subscription.tier}</div>
                  <div><strong>Status:</strong> {result.result.subscription.status}</div>
                  <div><strong>Expires:</strong> {new Date(result.result.subscription.current_period_end).toLocaleDateString()}</div>
                </div>
              </div>
            )}

            {result.result.credits && (
              <div>
                <span className="text-sm font-medium text-gray-600">Credit Details:</span>
                <div className="text-sm text-gray-800 bg-white p-3 rounded border mt-1">
                  <div><strong>Balance:</strong> {result.result.credits.balance}</div>
                  <div><strong>Total Earned:</strong> {result.result.credits.total_earned}</div>
                  <div><strong>Total Spent:</strong> {result.result.credits.total_spent}</div>
                  {result.result.amount && (
                    <div><strong>Amount Added:</strong> {result.result.amount}</div>
                  )}
                </div>
              </div>
            )}

            {result.result.action && !result.result.subscription && !result.result.credits && (
              <div>
                <span className="text-sm font-medium text-gray-600">Result:</span>
                <div className="text-sm text-gray-800 bg-white p-3 rounded border mt-1">
                  Action "{result.result.action}" completed successfully
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}