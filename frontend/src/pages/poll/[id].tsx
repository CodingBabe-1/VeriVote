/**
 * Poll Detail page — Shows a single poll with voting interface.
 * Handles: wallet connection, vote casting, cross-contract eligibility errors,
 * network errors, post-vote confirmation, and real-time results.
 */
import React, { useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { WalletButton } from '@/components/WalletButton';
import { VoteForm } from '@/components/VoteForm';
import { ActivityFeed } from '@/components/ActivityFeed';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { useWallet } from '@/hooks/useWallet';
import { useEvents } from '@/hooks/useEvents';
import { usePollDetail } from '@/hooks/usePolls';

export default function PollPage() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const wallet = useWallet();
  const { activities, isStreaming } = useEvents();
  const { poll, loading, error, voting, vote, refetch } = usePollDetail(id || '');

  const handleVote = useCallback(
    async (optionIndex: number) => {
      if (!wallet.publicKey) {
        throw new Error('Wallet not connected');
      }
      return vote(optionIndex, wallet.publicKey);
    },
    [vote, wallet.publicKey]
  );

  return (
    <>
      <Head>
        <title>
          {poll ? poll.question : 'Poll'} — VeriVote
        </title>
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
          <a href="/" className="back-link">
            ← Back to polls
          </a>

          <div className="page-grid">
            <div className="page-content">
              {loading ? (
                <SkeletonLoader type="detail" count={1} />
              ) : error ? (
                <ErrorDisplay error={error} onRetry={refetch} />
              ) : poll ? (
                <div className="poll-detail">
                  <div className="poll-detail-header">
                    <h1>{poll.question}</h1>
                    <div className="poll-meta">
                      <span className={`badge ${poll.is_closed ? 'badge-closed' : 'badge-live'}`}>
                        {poll.is_closed ? 'Closed' : 'Live'}
                      </span>
                      <span>{poll.total_votes} total votes</span>
                      <span title={poll.creator}>
                        Created by {poll.creator?.slice(0, 6)}...
                        {poll.creator?.slice(-4)}
                      </span>
                    </div>
                  </div>

                  {!wallet.connected && !poll.is_closed && (
                    <div className="connect-prompt">
                      <span>🔑</span>
                      <p>Connect your wallet to vote in this poll.</p>
                    </div>
                  )}

                  <VoteForm
                    poll={poll}
                    onVote={handleVote}
                    hasVoted={false}
                    voting={voting}
                    error={error}
                    onRetry={refetch}
                  />
                </div>
              ) : (
                <div className="empty-state">
                  <p>Poll not found.</p>
                </div>
              )}
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

      <style jsx>{`
        .connect-prompt {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 24px;
          background: #fff7ed;
          border: 1px solid #fed7aa;
          border-radius: 12px;
          margin-bottom: 16px;
        }
        .connect-prompt span {
          font-size: 24px;
        }
        .connect-prompt p {
          font-size: 14px;
          color: #9a3412;
          margin: 0;
        }
      `}</style>
    </>
  );
}
