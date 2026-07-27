/**
 * PollCard — Displays a poll summary card with hover effects and live vote count.
 * Adapts to mobile layout.
 */
import React from 'react';
import { PollEntry } from '@/lib/soroban';

interface PollCardProps {
  poll: PollEntry;
  onSelect: (pollId: string) => void;
}

export const PollCard: React.FC<PollCardProps> = ({ poll, onSelect }) => {
  const isClosed = poll.is_closed;
  const timeAgo = getTimeAgo(poll.created_at);

  return (
    <div
      className={`poll-card ${isClosed ? 'closed' : 'active'}`}
      onClick={() => onSelect(poll.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(poll.id)}
    >
      <div className="poll-card-header">
        <span className={`poll-status ${isClosed ? 'status-closed' : 'status-live'}`}>
          {isClosed ? '🔒 Closed' : '🟢 Live'}
        </span>
        <span className="poll-time">{timeAgo}</span>
      </div>

      <h3 className="poll-question">{poll.question}</h3>

      <div className="poll-card-footer">
        <span className="poll-votes">
          <span className="vote-icon">🗳</span>
          {poll.total_votes} vote{poll.total_votes !== 1 ? 's' : ''}
        </span>
        <span className="poll-creator" title={poll.creator}>
          by {truncateAddress(poll.creator)}
        </span>
      </div>

      <div className="poll-card-arrow">→</div>

      <style jsx>{`
        .poll-card {
          position: relative;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 24px;
          cursor: pointer;
          transition: all 0.2s ease;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .poll-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
          border-color: #6366f1;
        }
        .poll-card:active {
          transform: translateY(0);
        }
        .poll-card.closed {
          opacity: 0.85;
          background: #f9fafb;
        }
        .poll-card-arrow {
          position: absolute;
          right: 24px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 20px;
          color: #9ca3af;
          transition: all 0.2s ease;
          opacity: 0;
        }
        .poll-card:hover .poll-card-arrow {
          opacity: 1;
          right: 20px;
        }
        .poll-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .poll-status {
          font-size: 13px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 20px;
        }
        .status-live {
          background: #dcfce7;
          color: #166534;
        }
        .status-closed {
          background: #f3f4f6;
          color: #6b7280;
        }
        .poll-time {
          font-size: 12px;
          color: #9ca3af;
        }
        .poll-question {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          margin: 0;
          line-height: 1.3;
          padding-right: 30px;
        }
        .poll-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .poll-votes {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
        }
        .vote-icon {
          font-size: 16px;
        }
        .poll-creator {
          font-size: 12px;
          color: #9ca3af;
          font-family: monospace;
        }

        @media (max-width: 768px) {
          .poll-card {
            padding: 16px;
            gap: 8px;
            border-radius: 12px;
          }
          .poll-question {
            font-size: 16px;
          }
          .poll-card-arrow {
            right: 16px;
          }
        }
      `}</style>
    </div>
  );
};

function truncateAddress(addr: string): string {
  if (!addr || addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function getTimeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
