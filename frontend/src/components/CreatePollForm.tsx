/**
 * CreatePollForm — Opens in a modal/overlay. Collects question + multi-option
 * input, validates, and submits via the PollFactory contract.
 * Requires a connected wallet for signing.
 */
import React, { useState, useCallback } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useCreatePoll } from '@/hooks/usePolls';
import { ErrorDisplay } from './ErrorDisplay';

interface CreatePollFormProps {
  onCreated: (pollAddress: string) => void;
  onCancel: () => void;
}

export const CreatePollForm: React.FC<CreatePollFormProps> = ({
  onCreated,
  onCancel,
}) => {
  const wallet = useWallet();
  const { creating, error, create, dismissError } = useCreatePoll();

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);

  const addOption = useCallback(() => {
    setOptions((prev) => (prev.length < 10 ? [...prev, ''] : prev));
  }, []);

  const removeOption = useCallback((index: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateOption = useCallback((index: number, value: string) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }, []);

  const validOptions = options.filter((o) => o.trim().length > 0);

  const canSubmit =
    question.trim().length > 0 &&
    validOptions.length >= 2 &&
    wallet.connected &&
    wallet.publicKey &&
    !creating;

  const handleSubmit = async () => {
    if (!canSubmit || !wallet.publicKey) return;

    try {
      const { pollAddress } = await create(
        question.trim(),
        validOptions,
        wallet.publicKey
      );
      onCreated(pollAddress);
    } catch {
      // error handled via hook
    }
  };

  return (
    <div className="create-overlay">
      <div className="create-modal">
        <div className="create-header">
          <h2>Create New Poll</h2>
          <button className="close-btn" onClick={onCancel}>
            ✕
          </button>
        </div>

        {!wallet.connected && (
          <div className="connect-banner">
            <span>🔑</span>
            <p>Connect your Freighter wallet to create polls on-chain.</p>
          </div>
        )}

        {error && <ErrorDisplay error={error} onRetry={dismissError} />}

        <div className="form-group">
          <label htmlFor="poll-question">Question</label>
          <input
            id="poll-question"
            type="text"
            placeholder="e.g., What's the best programming language?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={creating}
            maxLength={200}
          />
        </div>

        <div className="form-group">
          <label>
            Options
            <span className="hint">{options.length}/10 max</span>
          </label>
          <div className="options-grid">
            {options.map((opt, i) => (
              <div key={i} className="option-row">
                <span className="option-num">{i + 1}</span>
                <input
                  type="text"
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  disabled={creating}
                  maxLength={100}
                />
                {options.length > 2 && (
                  <button
                    className="remove-btn"
                    onClick={() => removeOption(i)}
                    disabled={creating}
                    title="Remove option"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 10 && (
            <button
              className="add-option-btn"
              onClick={addOption}
              disabled={creating}
            >
              + Add option
            </button>
          )}
        </div>

        <div className="create-actions">
          <button className="btn btn-outline" onClick={onCancel} disabled={creating}>
            Cancel
          </button>
          <button
            className="btn btn-primary btn-lg"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {creating ? (
              <span className="submitting">
                <span className="spinner" /> Deploying...
              </span>
            ) : (
              '🚀 Deploy Poll'
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        .create-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .create-modal {
          background: #fff;
          border-radius: 20px;
          width: 90%;
          max-width: 560px;
          max-height: 90vh;
          overflow-y: auto;
          padding: 32px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
          animation: slideUp 0.3s ease;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .create-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .create-header h2 {
          margin: 0;
          font-size: 22px;
          color: #111827;
        }
        .close-btn {
          background: none;
          border: none;
          font-size: 22px;
          color: #9ca3af;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 8px;
          transition: all 0.15s;
        }
        .close-btn:hover {
          background: #f3f4f6;
          color: #374151;
        }
        .connect-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          background: #fff7ed;
          border: 1px solid #fed7aa;
          border-radius: 12px;
          margin-bottom: 20px;
        }
        .connect-banner span { font-size: 22px; }
        .connect-banner p {
          font-size: 14px;
          color: #9a3412;
          margin: 0;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-group label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }
        .hint {
          font-size: 12px;
          color: #9ca3af;
          font-weight: 400;
        }
        .form-group input[type="text"] {
          width: 100%;
          padding: 12px 16px;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          font-size: 15px;
          font-family: inherit;
          transition: border-color 0.2s;
          color: #111827;
        }
        .form-group input[type="text"]:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        .form-group input[type="text"]:disabled {
          background: #f9fafb;
          opacity: 0.7;
        }
        .options-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 8px;
        }
        .option-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .option-num {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          color: #6b7280;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          flex-shrink: 0;
        }
        .option-row input {
          flex: 1;
        }
        .remove-btn {
          background: none;
          border: none;
          font-size: 20px;
          color: #ef4444;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          flex-shrink: 0;
          transition: background 0.15s;
        }
        .remove-btn:hover:not(:disabled) {
          background: #fef2f2;
        }
        .remove-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .add-option-btn {
          background: #f5f3ff;
          border: 1px dashed #c4b5fd;
          color: #6366f1;
          padding: 10px;
          border-radius: 10px;
          width: 100%;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }
        .add-option-btn:hover:not(:disabled) {
          background: #ede9fe;
        }
        .add-option-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .create-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 28px;
        }
        .submitting {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 600px) {
          .create-modal {
            padding: 20px;
            border-radius: 16px;
            width: 95%;
          }
          .create-header h2 {
            font-size: 18px;
          }
          .create-actions {
            flex-direction: column;
          }
          .create-actions .btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
