/**
 * SkeletonLoader — Animated placeholder for loading states.
 */
import React from 'react';

interface SkeletonProps {
  type: 'card' | 'list' | 'detail' | 'text';
  count?: number;
}

export const SkeletonLoader: React.FC<SkeletonProps> = ({ type, count = 1 }) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className="skeleton skeleton-card">
            <div className="skeleton-line skeleton-title" />
            <div className="skeleton-line skeleton-body" />
            <div className="skeleton-line skeleton-body short" />
            <div className="skeleton-footer">
              <div className="skeleton-chip" />
              <div className="skeleton-chip" />
            </div>
          </div>
        );
      case 'list':
        return (
          <div className="skeleton skeleton-list">
            <div className="skeleton-row">
              <div className="skeleton-circle" />
              <div className="skeleton-line skeleton-body" />
            </div>
            <div className="skeleton-row">
              <div className="skeleton-circle" />
              <div className="skeleton-line skeleton-body short" />
            </div>
            <div className="skeleton-row">
              <div className="skeleton-circle" />
              <div className="skeleton-line skeleton-body" />
            </div>
          </div>
        );
      case 'detail':
        return (
          <div className="skeleton skeleton-detail">
            <div className="skeleton-line skeleton-title" />
            <div className="skeleton-options">
              <div className="skeleton-option" />
              <div className="skeleton-option" />
              <div className="skeleton-option" />
            </div>
            <div className="skeleton-button" />
          </div>
        );
      case 'text':
      default:
        return <div className="skeleton-line skeleton-body" />;
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-wrapper">
          {renderSkeleton()}
        </div>
      ))}
      <style jsx>{`
        .skeleton-wrapper {
          margin-bottom: 16px;
        }
        .skeleton {
          background: #fff;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .skeleton-line {
          height: 14px;
          border-radius: 7px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
          margin-bottom: 10px;
        }
        .skeleton-title {
          width: 60%;
          height: 20px;
        }
        .skeleton-body {
          width: 100%;
        }
        .skeleton-body.short {
          width: 40%;
        }
        .skeleton-footer {
          display: flex;
          gap: 8px;
          margin-top: 16px;
        }
        .skeleton-chip {
          width: 60px;
          height: 24px;
          border-radius: 12px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
        }
        .skeleton-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .skeleton-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
          flex-shrink: 0;
        }
        .skeleton-options {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin: 16px 0;
        }
        .skeleton-option {
          width: 100%;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
        }
        .skeleton-button {
          width: 140px;
          height: 44px;
          border-radius: 12px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </>
  );
};
