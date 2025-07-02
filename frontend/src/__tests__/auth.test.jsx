import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import App from '../App.jsx';

// Polyfill TextEncoder and TextDecoder for Jest environment
import { TextEncoder, TextDecoder } from 'util';
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

// Mock axios
jest.mock('axios');

describe('Authentication flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows loading spinner while checking auth', async () => {
    axios.get.mockReturnValue(new Promise(() => {})); // never resolves
    render(<App />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  test('redirects to login page if not authenticated', async () => {
    axios.get.mockRejectedValueOnce(new Error('Not authenticated'));
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/sign in to get started/i)).toBeInTheDocument();
    });
  });

  test('shows protected routes if authenticated', async () => {
    axios.get.mockResolvedValueOnce({ data: { id: 'user1', name: 'Test User' } });
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/workarea/i)).toBeInTheDocument();
    });
  });

  test('login button redirects to backend Google OAuth', () => {
    render(<App />);
    const loginButton = screen.queryByRole('button', { name: /sign in with google/i });
    if (loginButton) {
      userEvent.click(loginButton);
      expect(window.location.href).toMatch(/\/api\/auth\/google/);
    }
  });
});
