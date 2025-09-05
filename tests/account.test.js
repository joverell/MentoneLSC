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

// Mock firebase/storage
jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => 'mock-storage'),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ message: 'Profile updated successfully!' }),
  })
);

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
    // 1. Render the Account component
    render(<Account />);

    // 2. Simulate file selection
    const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText(/Profile Photo/i);
    fireEvent.change(fileInput, { target: { files: [file] } });

    // 3. Mock the storage functions
    const mockPhotoRef = 'mock-photo-ref';
    const mockDownloadURL = 'https://fake-url.com/chucknorris.png';
    ref.mockReturnValue(mockPhotoRef);
    uploadBytes.mockResolvedValue({});
    getDownloadURL.mockResolvedValue(mockDownloadURL);

    // 4. Simulate form submission
    const updateButton = screen.getByRole('button', { name: /Update Profile/i });
    fireEvent.click(updateButton);

    // 5. Assert that the upload and update functions were called correctly
    await waitFor(() => {
      // Check that the file was uploaded to the correct path
      expect(ref).toHaveBeenCalledWith(expect.anything(), `profile-photos/${mockUser.uid}/${file.name}`);
      expect(uploadBytes).toHaveBeenCalledWith(mockPhotoRef, file);

      // Check that the user's profile was updated with the new photo URL
      expect(fetch).toHaveBeenCalledWith(`/api/users/${mockUser.uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: mockUser.name,
          email: mockUser.email,
          photoURL: mockDownloadURL,
          patrolQualifications: '',
          emergencyContact: '',
          uniformSize: '',
          notificationSettings: { news: true, events: true, chat: true },
        }),
      });
    });

    // 6. Check for success message
    expect(await screen.findByText('Profile updated successfully!')).toBeInTheDocument();
  });
});
