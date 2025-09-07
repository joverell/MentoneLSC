import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Account from '../pages/account';
import { useAuth } from '../context/AuthContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Mock next/router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '',
      query: '',
      asPath: '',
    };
  },
}));

// Mock the useAuth hook
jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock firebase/storage as it's not directly used in the component for upload anymore
jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => 'mock-storage'),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('Account Page', () => {
  const mockUser = {
    uid: 'test-uid',
    name: 'Test User',
    email: 'test@example.com',
    photoURL: null,
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup the mock for useAuth
    useAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      loading: false,
      fetchUser: jest.fn(),
    });
  });

  test('should allow a user to upload a profile photo', async () => {
    // Setup fetch mock for profile update
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'Profile updated successfully!' }),
    });

    render(<Account />);

    const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText(/Profile Photo/i);
    fireEvent.change(fileInput, { target: { files: [file] } });

    const updateButton = screen.getByRole('button', { name: /Update Profile/i });
    fireEvent.click(updateButton);

    await waitFor(() => {
      // Verify the single API call to update the profile
      expect(fetch).toHaveBeenCalledWith(`/api/users/${mockUser.uid}`, {
        method: 'PUT',
        body: expect.any(FormData),
      });
    });

    expect(await screen.findByText('Profile updated successfully!')).toBeInTheDocument();
  });
});
