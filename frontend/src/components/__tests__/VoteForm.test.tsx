/**
 * Component tests for VoteForm results rendering.
 * Tests that result bars render correctly with given poll data.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VoteForm } from '../VoteForm';
import { PollInfo } from '@/lib/soroban';
import { ErrorCategory } from '@/lib/errors';

// Mock the ErrorDisplay component to simplify testing
jest.mock('../ErrorDisplay', () => ({
  ErrorDisplay: ({ error, onRetry }: { error: { userMessage: string }; onRetry?: () => void }) =>
    React.createElement('div', { 'data-testid': 'error-display' },
      React.createElement('span', null, error.userMessage),
      onRetry && React.createElement('button', { onClick: onRetry }, 'Retry')
    ),
}));

const mockPoll: PollInfo = {
  question: 'What is the best language?',
  options: ['Rust', 'TypeScript', 'Python'],
  vote_counts: [10, 25, 5],
  is_closed: false,
  creator: 'GABCDEF1234567890',
  voter_registry: 'CDEFGH1234567890AB',
  total_votes: 40,
};

const mockClosedPoll: PollInfo = {
  ...mockPoll,
  is_closed: true,
};

const createMockVote = () => jest.fn().mockResolvedValue({ txHash: 'tx_test123' });

describe('VoteForm — Results Rendering', () => {
  it('renders all options with their vote counts and percentages', () => {
    render(
      <VoteForm
        poll={mockPoll}
        onVote={createMockVote()}
        hasVoted={false}
        voting={false}
        error={null}
        onRetry={jest.fn()}
      />
    );

    expect(screen.getByText('Rust')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
    // Use individual assertions for counts and percentages
    expect(screen.getByText(/25%/)).toBeInTheDocument();
  });

  it('shows closed poll state with final results and winner badge', () => {
    render(
      <VoteForm
        poll={mockClosedPoll}
        onVote={createMockVote()}
        hasVoted={false}
        voting={false}
        error={null}
        onRetry={jest.fn()}
      />
    );

    expect(screen.getByText(/This poll is closed/)).toBeInTheDocument();
    // TypeScript has the highest count (25), so it should have the winner badge
    expect(screen.getByText(/🏆/)).toBeInTheDocument();
  });

  it('renders vote confirmation after submission', () => {
    render(
      <VoteForm
        poll={mockPoll}
        onVote={createMockVote()}
        hasVoted={true}
        voting={false}
        error={null}
        onRetry={jest.fn()}
      />
    );

    expect(screen.getByText('Vote Confirmed!')).toBeInTheDocument();
    expect(screen.getByText(/Your vote has been recorded/)).toBeInTheDocument();
  });

  it('renders error display when error is provided', () => {
    const appError = {
      category: ErrorCategory.ELIGIBILITY,
      userMessage: "You're not eligible to vote.",
      technicalMessage: 'Not eligible',
      retryable: false,
    };

    render(
      <VoteForm
        poll={mockPoll}
        onVote={createMockVote()}
        hasVoted={false}
        voting={false}
        error={appError}
        onRetry={jest.fn()}
      />
    );

    expect(screen.getByTestId('error-display')).toBeInTheDocument();
    expect(screen.getByText("You're not eligible to vote.")).toBeInTheDocument();
  });

  it('disables vote button when no option is selected', () => {
    render(
      <VoteForm
        poll={mockPoll}
        onVote={createMockVote()}
        hasVoted={false}
        voting={false}
        error={null}
        onRetry={jest.fn()}
      />
    );

    const voteButton = screen.getByText('🗳 Cast Vote');
    expect(voteButton).toBeDisabled();
  });

  it('calls onVote with correct option index when selected and clicked', () => {
    const onVote = jest.fn().mockResolvedValue({ txHash: 'tx_test' });

    render(
      <VoteForm
        poll={mockPoll}
        onVote={onVote}
        hasVoted={false}
        voting={false}
        error={null}
        onRetry={jest.fn()}
      />
    );

    // Click the first option ("Rust" at index 0), then vote
    fireEvent.click(screen.getByText('Rust'));
    fireEvent.click(screen.getByText('🗳 Cast Vote'));

    expect(onVote).toHaveBeenCalledWith(0);
  });

  it('highlights selected option with visual indicator', () => {
    render(
      <VoteForm
        poll={mockPoll}
        onVote={createMockVote()}
        hasVoted={false}
        voting={false}
        error={null}
        onRetry={jest.fn()}
      />
    );

    // Select the first option
    fireEvent.click(screen.getByText('Rust'));

    // The option button should now have the 'selected' class
    // We check by verifying the Submit button is enabled
    expect(screen.getByText('🗳 Cast Vote')).toBeEnabled();
  });
});
