/**
 * Index page — VeriVote home: lists all polls, shows activity feed,
 * and includes a Create Poll button with modal form overlay.
 * Demonstrates: wallet connect, poll list with loading skeletons,
 * real-time event-driven activity feed, on-chain poll creation, error handling.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import Head from 'next/head';
import { WalletButton } from '@/components/WalletButton';
import { PollList } from '@/components/PollList';
import { ActivityFeed } from '@/components/ActivityFeed';
import { CreatePollForm } from '@/components/CreatePollForm';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { useWallet } from '@/hooks/useWallet';
import { useEvents } from '@/hooks/useEvents';
import { usePolls } from '@/hooks/usePolls';

export default function HomePage() {
  const wallet = useWallet();
  const { activities, isStreaming } = useEvents();
  const { polls, loading, error, refetch } = usePolls();
  const [showCreate, setShowCreate] = useState(false);

  const handleSelectPoll = useCallback((pollId: string) => {
    window.location.href = `/poll/${pollId}`;
  }, []);

  const navTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up navigation timeout on unmount
  useEffect(() => {
    return () => {
      if (navTimeoutRef.current) {
        clearTimeout(navTimeoutRef.current);
      }
    };
  }, []);

  const handlePollCreated = useCallback(
    (pollAddress: string) => {
      setShowCreate(false);
      refetch(); // Refresh poll list
      // Navigate to the new poll after a brief delay for tx settlement
      navTimeoutRef.current = setTimeout(() => {
        window.location.href = `/poll/${pollAddress}`;
      }, 3000);
    },
    [refetch]
  );

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
          <div className="header-actions">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowCreate(true)}
            >
              + New Poll
            </button>
            <WalletButton />
          </div>
        </div>
      </header>

      <main className="main">
        <div className="container">
          <div className="page-title-row">
            <div>
              <h1 className="page-title">Active Polls</h1>
              <p className="page-subtitle">
                Vote on-chain with Stellar Soroban. Secure, transparent, and
                verifiable.
              </p>
            </div>
          </div>

          <div className="page-grid">
            <div className="page-content">
              {error && <ErrorDisplay error={error} onRetry={refetch} />}
              <PollList
                polls={polls}
                loading={loading}
                onSelectPoll={handleSelectPoll}
                onCreatePoll={() => setShowCreate(true)}
              />
            </div>

            <aside className="sidebar">
              <ActivityFeed activities={activities} isStreaming={isStreaming} />
            </aside>
          </div>
        </div>
      </main>

      {showCreate && (
        <CreatePollForm
          onCreated={handlePollCreated}
          onCancel={() => setShowCreate(false)}
        />
      )}

      <style jsx>{`
        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .page-title-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 8px;
        }
        @media (max-width: 768px) {
          .header-actions {
            gap: 8px;
          }
        }
      `}</style>
    </>
  );
}
