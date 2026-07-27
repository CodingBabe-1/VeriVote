/**
 * PollList — Grid display of poll cards with loading and empty states.
 */
import React from 'react';
import { PollCard } from './PollCard';
import { SkeletonLoader } from './SkeletonLoader';
import { PollEntry } from '@/lib/soroban';

interface PollListProps {
  polls: PollEntry[];
  loading: boolean;
  onSelectPoll: (pollId: string) => void;
}

export const PollList: React.FC<PollListProps> = ({ polls, loading, onSelectPoll }) => {
  if (loading) {
    return (
      <div className="poll-grid">
        <SkeletonLoader type="card" count={3} />
        <style jsx>{`
          .poll-grid { display: grid; gap: 16px; }
        `}</style>
      </div>
    );
  }

  if (polls.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon">📭</span>
        <h3>No Polls Yet</h3>
        <p>Create the first poll to get started!</p>
        <button className="btn btn-primary">Create a Poll</button>
        <style jsx>{`
          .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #6b7280;
          }
          .empty-icon { font-size: 48px; display: block; margin-bottom: 16px; }
          h3 { margin: 0 0 8px; color: #374151; font-size: 20px; }
          p { margin: 0 0 24px; font-size: 15px; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="poll-grid">
      {polls.map((poll) => (
        <PollCard key={poll.id} poll={poll} onSelect={onSelectPoll} />
      ))}
      <style jsx>{`
        .poll-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 16px;
        }
        @media (max-width: 768px) {
          .poll-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
