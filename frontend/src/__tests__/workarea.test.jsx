import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import axios from 'axios';
import WorkArea from '../components/WorkArea.jsx';

jest.mock('axios');

describe('WorkArea Component', () => {
  const mockUser = { id: 'user1', name: 'Test User' };
  const mockInitialSessions = {
    'session1': { _id: 'session1', name: 'Chat 1', createdAt: new Date().toISOString() },
  };
  const setInitialSessions = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders file list and previous chats', () => {
    render(<WorkArea user={mockUser} initialSessions={mockInitialSessions} setInitialSessions={setInitialSessions} />);
    expect(screen.getByText(/File List/i)).toBeInTheDocument();
    expect(screen.getByText(/Previous Chats/i)).toBeInTheDocument();
  });

  test('auto-selects first chat session on load', async () => {
    render(<WorkArea user={mockUser} initialSessions={mockInitialSessions} setInitialSessions={setInitialSessions} />);
    await waitFor(() => {
      expect(screen.getByText('Chat 1')).toBeInTheDocument();
    });
  });

  test('creates a new chat session', async () => {
    axios.post.mockResolvedValueOnce({
      data: { _id: 'session2', name: 'New Chat', createdAt: new Date().toISOString() }
    });

    render(<WorkArea user={mockUser} initialSessions={{}} setInitialSessions={setInitialSessions} />);
    // Simulate creating a new chat session by calling createChat function or UI interaction
    // This requires exposing createChat or simulating UI, so this is a placeholder for now
  });

  test('handles file upload error gracefully', async () => {
    // Simulate file upload error and check for alert or error handling
  });

  // Additional tests for message sending, mind map generation, etc. can be added here
});
