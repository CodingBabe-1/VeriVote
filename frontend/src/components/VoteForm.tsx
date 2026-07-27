/**
 * VoteForm — Voting UI with option selection, submit button, result bars, and vote confirmation.
 * Handles loading state during submission and error display.
 */
import React, { useState } from 'react';
import { PollInfo } from '@/lib/soroban';
import { ErrorDisplay } from './ErrorDisplay';
import { AppError } from '@/lib/errors';

interface VoteFormProps {
  poll: PollInfo;
  onVote: (optionIndex: number) => Promise<{ txHash: string }>;
  hasVoted: boolean;
  voting: boolean;
  error: AppError | null;
  onRetry: () => void;
}

export const VoteForm: React.FC<VoteFormProps> = ({
  poll,
  onVote,
  hasVoted,
  voting,
  error,
  onRetry,
}) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const totalVotes = poll.total_votes || 1; // avoid division by zero

  const handleVote = async () => {
    if (selectedOption === null || voting) return;
    try {
      const result = await onVote(selectedOption);
      setSubmitted(true);
      console.log('Vote successful, tx:', result.txHash);
    } catch {
      // Error handled by parent via error prop
    }
  };

  if (poll.is_closed) {
    return (
      <div className="vote-closed">
        <span>🔒</span>
        <p>This poll is closed. Here are the final results:</p>
        <ResultBars poll={poll} totalVotes={totalVotes} />
        <style jsx>{`
          .vote-closed {
            text-align: center;
            padding: 24px;
            background: #f9fafb;
            border-radius: 12px;
          }
          span { font-size: 32px; }
          p { color: #6b7280; margin: 12px 0 20px; }
        `}</style>
      </div>
    );
  }

  if (submitted || hasVoted) {
    return (
      <div className="vote-confirmed">
        <span className="checkmark">✅</span>
        <h3>Vote Confirmed!</h3>
        <p>Your vote has been recorded on-chain.</p>
        <ResultBars poll={poll} totalVotes={totalVotes} />
        <style jsx>{`
          .vote-confirmed {
            text-align: center;
            padding: 24px;
            animation: fadeIn 0.4s ease-out;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          .checkmark { font-size: 48px; display: block; margin-bottom: 12px; }
          h3 { margin: 0 0 8px; color: #166534; }
          p { color: #6b7280; font-size: 14px; margin: 0 0 20px; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="vote-form">
      {error && <ErrorDisplay error={error} onRetry={onRetry} />}

      <div className="options-list">
        {poll.options.map((option, index) => {
          const count = poll.vote_counts[index] || 0;
          const percentage = Math.round((count / totalVotes) * 100);
          const isSelected = selectedOption === index;

          return (
            <button
              key={index}
              className={`option-btn ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedOption(index)}
              disabled={voting}
            >
              <div className="option-content">
                <span className="option-label">
                  <span className={`radio ${isSelected ? 'radio-selected' : ''}`}>
                    {isSelected && <span className="radio-dot" />}
                  </span>
                  {option}
                </span>
                <span className="option-stats">
                  {count} vote{count !== 1 ? 's' : ''} ({percentage}%)
                </span>
              </div>
              <div className="option-bar">
                <div
                  className="option-bar-fill"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      <button
        className="btn btn-primary btn-lg vote-submit"
        disabled={selectedOption === null || voting}
        onClick={handleVote}
      >
        {voting ? (
          <span className="submitting">
            <span className="spinner" /> Submitting...
          </span>
        ) : (
          '🗳 Cast Vote'
        )}
      </button>

      <style jsx>{`
        .vote-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .options-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .option-btn {
          background: #fff;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          width: 100%;
        }
        .option-btn:hover:not(:disabled) {
          border-color: #6366f1;
          background: #f5f3ff;
          transform: translateX(4px);
        }
        .option-btn.selected {
          border-color: #6366f1;
          background: #eef2ff;
          box-shadow: 0 0 0 1px #6366f1;
        }
        .option-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .option-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .option-label {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 15px;
          font-weight: 500;
          color: #111827;
        }
        .radio {
          width: 20px;
          height: 20px;
          border: 2px solid #d1d5db;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: border-color 0.2s;
        }
        .radio-selected {
          border-color: #6366f1;
        }
        .radio-dot {
          width: 10px;
          height: 10px;
          background: #6366f1;
          border-radius: 50%;
          animation: popIn 0.3s ease;
        }
        @keyframes popIn {
          0% { transform: scale(0); }
          70% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        .option-stats {
          font-size: 13px;
          color: #6b7280;
          font-weight: 500;
        }
        .option-bar {
          width: 100%;
          height: 6px;
          background: #f3f4f6;
          border-radius: 3px;
          overflow: hidden;
        }
        .option-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #6366f1, #8b5cf6);
          border-radius: 3px;
          transition: width 0.6s ease;
        }
        .vote-submit {
          align-self: stretch;
          margin-top: 8px;
          padding: 16px;
          font-size: 16px;
          font-weight: 600;
        }
        .submitting {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .option-btn {
            padding: 14px 12px;
          }
          .option-label {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
};

/** Small helper for result bars (used by closed polls and post-vote) */
const ResultBars: React.FC<{ poll: PollInfo; totalVotes: number }> = ({
  poll,
  totalVotes,
}) => (
  <div className="results-bars">
    {poll.options.map((option, i) => {
      const count = poll.vote_counts[i] || 0;
      const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
      const winner =
        !poll.is_closed || poll.vote_counts.length === 0
          ? false
          : count === Math.max(...poll.vote_counts);
      return (
        <div key={i} className={`result-row ${winner ? 'winner' : ''}`}>
          <div className="result-label">
            <span>
              {winner && '🏆 '}
              {option}
            </span>
            <span className="result-count">{count} ({pct}%)</span>
          </div>
          <div className="result-bar">
            <div
              className={`result-fill ${winner ? 'winner-fill' : ''}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      );
    })}
    <style jsx>{`
      .results-bars { width: 100%; display: flex; flex-direction: column; gap: 12px; }
      .result-row { text-align: left; }
      .result-label { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 4px; }
      .winner .result-label span:first-child { font-weight: 700; color: #166534; }
      .result-count { color: #6b7280; font-weight: 500; }
      .result-bar { width: 100%; height: 10px; background: #f3f4f6; border-radius: 5px; overflow: hidden; }
      .result-fill { height: 100%; background: #6366f1; border-radius: 5px; transition: width 0.5s ease; }
      .winner-fill { background: linear-gradient(90deg, #22c55e, #16a34a); }
    `}</style>
  </div>
);
