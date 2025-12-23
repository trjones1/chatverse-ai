'use client';

import { useAuth } from '@/contexts/AuthContext';
import { isAdminUser } from '@/lib/admin';
import RequireAuth from '@/components/RequireAuth';
import AdminCleanupButton from '@/components/AdminCleanupButton';
import RelationshipDashboard from '@/components/admin/RelationshipDashboard';
import ContentPipelineManager from '@/components/admin/ContentPipelineManager';
import ImageApprovalManager from '@/components/admin/ImageApprovalManager';
import UserActivityDashboard from '@/components/admin/UserActivityDashboard';
import SelfieManager from '@/components/admin/SelfieManager';
import GridSlicer from '@/components/admin/GridSlicer';
import UserStatusChecker from '@/components/admin/UserStatusChecker';
import UserAccessGranter from '@/components/admin/UserAccessGranter';
import VerseCoinsPromotionManager from '@/components/admin/VerseCoinsPromotionManager';
import VerseCoinsEconomyDashboard from '@/components/admin/VerseCoinsEconomyDashboard';
import UnifiedRevenueDashboard from '@/components/admin/UnifiedRevenueDashboard';
import PageViewAnalytics from '@/components/admin/PageViewAnalytics';
import NewUserSignupWidget from '@/components/admin/NewUserSignupWidget';
import QuickStatsWidget from '@/components/admin/QuickStatsWidget';
import ActiveUsersWidget from '@/components/admin/ActiveUsersWidget';
import ConversionFunnelWidget from '@/components/admin/ConversionFunnelWidget';
import EngagementMetricsWidget from '@/components/admin/EngagementMetricsWidget';
import CharacterPerformanceWidget from '@/components/admin/CharacterPerformanceWidget';
import TimeBasedAnalyticsWidget from '@/components/admin/TimeBasedAnalyticsWidget';
import { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const { user } = useAuth();
  
  // State for auth check completion
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('🔧 ADMIN PAGE: Component initializing...');
      console.log('🔧 ADMIN PAGE: Environment check:', {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        nodeEnv: process.env.NODE_ENV
      });
      setHasCheckedAuth(true);
      setIsClient(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('🔧 ADMIN PAGE: User auth state:', {
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        userRaw: user
      });
    }
  }, [user]);
  
  // State for loading state (used by remaining components)
  const [isLoading, setIsLoading] = useState(true);
  const [activeMainTab, setActiveMainTab] = useState<'analytics' | 'versecoins' | 'content' | 'users' | 'system'>('analytics');

  // Check if user has admin access - only proper authenticated admins
  const isAdmin = isAdminUser(user);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('🔧 ADMIN PAGE: Checking admin access...');
      console.log('🔧 ADMIN PAGE: Admin check result:', {
        isAdmin,
        userForAdminCheck: user
      });
    }
  }, [isAdmin, user]);

  // Simple loading state management
  useEffect(() => {
    if (isAdmin && user) {
      setIsLoading(false);
    }
  }, [isAdmin, user]);

  // Show loading while checking local auth to prevent hydration issues
  if (!hasCheckedAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <RequireAuth>
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-6">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-4">
              You do not have admin privileges to access this dashboard.
            </p>
            <p className="text-sm text-gray-500">
              Admin access is restricted to authorized emails only.
            </p>
          </div>
        </div>
      </RequireAuth>
    );
  }

  // For local admin users, bypass RequireAuth completely to avoid auth issues
  const AdminContent = () => (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">
            Welcome Admin - Business Intelligence & Management Tools
          </p>
        </div>

        {/* New User Signups Widget */}
        <NewUserSignupWidget />

        {/* Main Navigation Tabs */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-0">
              {[
                { id: 'analytics', label: '📊 Analytics & Revenue', desc: 'Revenue, user activity, page views' },
                { id: 'versecoins', label: '⭐ VerseCoins', desc: 'Economy, promotions, relationships' },
                { id: 'content', label: '🎨 Content', desc: 'Images, selfies, grid management' },
                { id: 'users', label: '👥 Users', desc: 'User management and access' },
                { id: 'system', label: '⚙️ System', desc: 'Admin tools and status' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveMainTab(tab.id as any)}
                  className={`flex-1 px-4 py-4 text-left border-r border-gray-200 last:border-r-0 transition-colors ${
                    activeMainTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-sm">{tab.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{tab.desc}</div>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeMainTab === 'analytics' && (
              <div className="space-y-6">
                {/* Quick Stats Widget - Real-time metrics */}
                <QuickStatsWidget />

                {/* Active Users & Peak Concurrent */}
                <ActiveUsersWidget />

                {/* Conversion Funnel */}
                <section className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 p-6">
                  <header className="mb-6">
                    <h2 className="text-xl font-semibold text-indigo-900">🔄 Conversion Funnel</h2>
                    <p className="text-indigo-700 mt-1">
                      Track visitor journey from first visit to purchase
                    </p>
                  </header>
                  <ConversionFunnelWidget />
                </section>

                {/* User Engagement Metrics */}
                <EngagementMetricsWidget />

                {/* Character Performance */}
                <CharacterPerformanceWidget />

                {/* Time-Based Analytics */}
                <TimeBasedAnalyticsWidget />

                {/* Unified Revenue Dashboard */}
                <section className="rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50/50 to-blue-50/50 p-6">
                  <header className="mb-6">
                    <h2 className="text-xl font-semibold text-purple-900">🎯 Unified Revenue Analytics</h2>
                    <p className="text-purple-700 mt-1">
                      VerseCoins economy, subscription metrics, and revenue insights for our prepaid credits model
                    </p>
                  </header>
                  <UnifiedRevenueDashboard />
                </section>

                {/* User Activity & Chat Usage Dashboard */}
                <section className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/50 to-cyan-50/50 p-6">
                  <header className="mb-6">
                    <h2 className="text-xl font-semibold text-blue-900">📊 User Activity & Engagement</h2>
                    <p className="text-blue-700 mt-1">
                      DAU/WAU/MAU metrics, chat usage patterns, and user engagement analytics by character
                    </p>
                  </header>
                  <UserActivityDashboard />
                </section>

                {/* Page View Analytics & Bounce Tracking */}
                <section className="rounded-xl border border-teal-200 bg-gradient-to-r from-teal-50/50 to-cyan-50/50 p-6">
                  <header className="mb-6">
                    <h2 className="text-xl font-semibold text-teal-900">👀 Page View Analytics & Bounce Rate</h2>
                    <p className="text-teal-700 mt-1">
                      Track all visitors including those who never engage, bounce rate, and session duration
                    </p>
                  </header>
                  <PageViewAnalytics />
                </section>
              </div>
            )}

            {activeMainTab === 'versecoins' && (
              <div className="space-y-6">
                {/* VerseCoins Promotion Management */}
                <section className="rounded-xl border border-yellow-200 bg-yellow-50/50 p-6">
                  <VerseCoinsPromotionManager isLoading={isLoading} />
                </section>

                {/* VerseCoins Economy Dashboard */}
                <section className="rounded-xl border border-purple-200 bg-purple-50/50 p-6">
                  <header className="mb-6">
                    <h2 className="text-xl font-semibold text-purple-900">VerseCoins Economy Analytics</h2>
                    <p className="text-purple-700 mt-1">
                      Monitor virtual economy health, circulation, and user spending patterns
                    </p>
                  </header>
                  <VerseCoinsEconomyDashboard />
                </section>

                {/* Relationship Score Dashboard */}
                <section className="rounded-xl border border-pink-200 bg-pink-50/50 p-6">
                  <RelationshipDashboard />
                </section>
              </div>
            )}

            {activeMainTab === 'content' && (
              <div className="space-y-6">
                {/* Grid Slicer */}
                <section className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-6">
                  <GridSlicer />
                </section>

                {/* Image Approval */}
                <section className="rounded-xl border border-orange-200 bg-orange-50/50 p-6">
                  <ImageApprovalManager />
                </section>

                {/* Selfie Management */}
                <section className="rounded-xl border border-pink-200 bg-pink-50/50 p-6">
                  <SelfieManager />
                </section>
              </div>
            )}

            {activeMainTab === 'users' && (
              <div className="space-y-6">
                {/* User Management */}
                <section className="rounded-xl border border-orange-200 bg-orange-50/50 p-6">
                  <header className="mb-6">
                    <h2 className="text-xl font-semibold text-orange-900">User Management</h2>
                    <p className="text-orange-700 mt-1">
                      Look up user status and manage subscriptions and voice credits for test accounts
                    </p>
                  </header>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <div>
                      <UserStatusChecker />
                    </div>
                    <div>
                      <UserAccessGranter />
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeMainTab === 'system' && (
              <div className="space-y-6">
                {/* Admin Tools */}
                <section className="rounded-xl border border-gray-200 bg-white/80 p-6">
                  <header className="mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Admin Tools</h2>
                    <p className="text-gray-600 mt-1">
                      Database management and system administration
                    </p>
                  </header>

                  <AdminCleanupButton />
                </section>

                {/* System Status */}
                <section className="rounded-xl border border-green-200 bg-green-50/50 p-6">
                  <header className="mb-4">
                    <h2 className="text-xl font-semibold text-green-900">System Status</h2>
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg border border-green-200 p-4">
                      <div className="text-green-600 font-semibold">Authentication</div>
                      <div className="text-2xl font-bold text-green-700">✓ Active</div>
                      <div className="text-sm text-gray-600">Admin access verified</div>
                    </div>

                    <div className="bg-white rounded-lg border border-green-200 p-4">
                      <div className="text-green-600 font-semibold">Database</div>
                      <div className="text-2xl font-bold text-green-700">✓ Connected</div>
                      <div className="text-sm text-gray-600">Supabase operational</div>
                    </div>

                    <div className="bg-white rounded-lg border border-green-200 p-4">
                      <div className="text-green-600 font-semibold">Admin Emails</div>
                      <div className="text-2xl font-bold text-green-700">3</div>
                      <div className="text-sm text-gray-600">Authorized users</div>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
  );

  // Return appropriate content based on admin status
  // All admin users go through normal auth
  return (
    <RequireAuth>
      <AdminContent />
    </RequireAuth>
  );
}