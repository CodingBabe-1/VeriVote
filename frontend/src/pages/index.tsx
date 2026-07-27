/**
 * Index page — VeriVote home: lists all polls, shows activity feed.
 * Demonstrates: wallet connect, poll list with loading skeletons,
 * real-time event-driven activity feed, error handling for all states.
 */
import React, { useCallback } from 'react';
import Head from 'next/head';
import { WalletButton } from '@/components/WalletButton';
import { PollList } from '@/components/PollList';
import { ActivityFeed } from '@/components/ActivityFeed';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { useWallet } from '@/hooks/useWallet';
import { useEvents } from '@/hooks/useEvents';
import { usePolls } from '@/hooks/usePolls';

export default function HomePage() {
  const wallet = useWallet();
  const { activities, isStreaming } = useEvents();
  const { polls, loading, error, refetch } = usePolls();

  const handleSelectPoll = useCallback((pollId: string) => {
    // Navigate to poll detail page
    window.location.href = `/poll/${pollId}`;
  }, []);

  return (
    <>
      <Head>
        <title>VeriVote — On-Chain Polling Platform</title>
        <meta
          name="description"
          content="Production-grade, multi-contract polling on Stellar Soroban"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="header">
        <div className="container header-inner">
          <a href="/" className="logo">
            Veri<span>Vote</span>
          </a>
          <WalletButton />
        </div>
      </header>

      <main className="main">
        <div className="container">
          <h1 className="page-title">Active Polls</h1>
          <p className="page-subtitle">
            Vote on-chain with Stellar Soroban. Secure, transparent, and verifiable.
          </p>

          <div className="page-grid">
            <div className="page-content">
              {error && (
                <ErrorDisplay error={error} onRetry={refetch} />
              )}
              <PollList
                polls={polls}
                loading={loading}
                onSelectPoll={handleSelectPoll}
              />
            </div>

            <aside className="sidebar">
              <ActivityFeed
                activities={activities}
                isStreaming={isStreaming}
              />
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
