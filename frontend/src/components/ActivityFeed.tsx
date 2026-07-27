/**
 * ActivityFeed — Real-time activity stream from Soroban events.
 * Displays vote casts, poll creations, and poll closures as they happen.
 * Mobile-friendly: collapses to a compact horizontal scroll on small screens.
 */
import React, { useEffect, useRef } from 'react';
import { ActivityEntry } from '@/lib/soroban';

interface ActivityFeedProps {
  activities: ActivityEntry[];
  isStreaming: boolean;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  isStreaming,
}) => {
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [activities.length]);

  const getActivityConfig = (type: ActivityEntry['type']) => {
    switch (type) {
      case 'vote':
        return { icon: '🗳', className: 'activity-vote', label: 'Vote cast' };
      case 'poll_created':
        return { icon: '🆕', className: 'activity-create', label: 'Poll created' };
      case 'poll_closed':
        return { icon: '🔒', className: 'activity-close', label: 'Poll closed' };
    }
  };

  return (
    <div className="activity-feed">
      <div className="feed-header">
        <h3>Activity Feed</h3>
        <span className={`stream-status ${isStreaming ? 'live' : 'offline'}`}>
          <span className="status-dot" />
          {isStreaming ? 'Live' : 'Reconnecting...'}
        </span>
      </div>

      <div className="feed-list" ref={feedRef}>
        {activities.length === 0 ? (
          <div className="feed-empty">
            <span>📡</span>
            <p>Listening for events...</p>
          </div>
        ) : (
          activities.map((activity, i) => {
            const config = getActivityConfig(activity.type);
            return (
              <div key={`${activity.pollId}-${i}`} className={`feed-item ${config.className}`}>
                <span className="feed-icon">{config.icon}</span>
                <div className="feed-content">
                  <span className="feed-type">{config.label}</span>
                  <span className="feed-poll">{activity.message}</span>
                </div>
                <span className="feed-time">{formatTime(activity.timestamp)}</span>
              </div>
            );
          })
        )}
      </div>

      <style jsx>{`
        .activity-feed {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          max-height: 420px;
        }
        .feed-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #f3f4f6;
        }
        .feed-header h3 {
          margin: 0;
          font-size: 16px;
          color: #111827;
        }
        .stream-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 12px;
        }
        .stream-status.live {
          background: #dcfce7;
          color: #166534;
        }
        .stream-status.offline {
          background: #fef2f2;
          color: #991b1b;
        }
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .feed-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
          scroll-behavior: smooth;
        }
        .feed-empty {
          text-align: center;
          padding: 40px 20px;
          color: #9ca3af;
        }
        .feed-empty span { font-size: 28px; }
        .feed-empty p { margin-top: 8px; font-size: 14px; }
        .feed-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 10px;
          margin-bottom: 4px;
          transition: background 0.2s;
          animation: slideDown 0.3s ease-out;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .feed-item:hover {
          background: #f9fafb;
        }
        .feed-icon {
          font-size: 20px;
          flex-shrink: 0;
        }
        .feed-content {
          flex: 1;
          min-width: 0;
        }
        .feed-type {
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .feed-poll {
          display: block;
          font-size: 13px;
          color: #374151;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .feed-time {
          font-size: 11px;
          color: #9ca3af;
          flex-shrink: 0;
        }
        .activity-vote .feed-type { color: #2563eb; }
        .activity-create .feed-type { color: #059669; }
        .activity-close .feed-type { color: #d97706; }

        @media (max-width: 768px) {
          .activity-feed {
            max-height: 300px;
            border-radius: 12px;
          }
          .feed-header {
            padding: 12px 16px;
          }
          .feed-item {
            padding: 10px 12px;
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
};

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return 'now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
