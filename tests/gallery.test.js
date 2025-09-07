import galleryHandler from '../pages/api/gallery/albums/index';
import { adminDb } from '../src/firebase-admin';
import jwt from 'jsonwebtoken';

jest.mock('../src/firebase-admin', () => ({
  adminDb: {
    collection: jest.fn(),
  },
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

describe('Gallery API', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      method: 'GET',
      headers: {
        cookie: '',
      },
    };
    res = {
      status: jest.fn(() => res),
      json: jest.fn(),
    };
  });

  describe('getAlbums', () => {
    it('should return all albums for an admin user', async () => {
        const albums = [
            { id: 'album1', data: () => ({ name: 'Album 1', visibleToGroups: ['group1'], createdAt: { toDate: () => new Date() } }) },
            { id: 'album2', data: () => ({ name: 'Album 2', visibleToGroups: [], createdAt: { toDate: () => new Date() } }) },
        ];
        adminDb.collection.mockReturnValue({
            orderBy: jest.fn(() => ({
                get: jest.fn(() => ({
                    docs: albums,
                })),
            })),
        });
        jwt.verify.mockReturnValue({ roles: ['Admin'] });
        req.headers.cookie = 'auth_token=test-token';

        await galleryHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const result = res.json.mock.calls[0][0];
        expect(result).toHaveLength(2);
        expect(result).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: 'Album 1' }),
                expect.objectContaining({ name: 'Album 2' }),
            ])
        );
    });

    it('should return only public albums for a guest user', async () => {
        const albums = [
            { id: 'album1', data: () => ({ name: 'Album 1', visibleToGroups: ['group1'], createdAt: { toDate: () => new Date() } }) },
            { id: 'album2', data: () => ({ name: 'Album 2', visibleToGroups: [], createdAt: { toDate: () => new Date() } }) },
        ];
        adminDb.collection.mockReturnValue({
            orderBy: jest.fn(() => ({
            get: jest.fn(() => ({
                docs: albums,
            })),
            })),
        });

        await galleryHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const result = res.json.mock.calls[0][0];
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(expect.objectContaining({ name: 'Album 2' }));
    });

    it('should return public albums and albums visible to the user\'s groups', async () => {
        const albums = [
            { id: 'album1', data: () => ({ name: 'Album 1', visibleToGroups: ['group1'], createdAt: { toDate: () => new Date() } }) },
            { id: 'album2', data: () => ({ name: 'Album 2', visibleToGroups: [], createdAt: { toDate: () => new Date() } }) },
            { id: 'album3', data: () => ({ name: 'Album 3', visibleToGroups: ['group2'], createdAt: { toDate: () => new Date() } }) },
        ];
        adminDb.collection.mockReturnValue({
            orderBy: jest.fn(() => ({
                get: jest.fn(() => ({
                    docs: albums,
                })),
            })),
        });
        jwt.verify.mockReturnValue({ groupIds: ['group1'] });
        req.headers.cookie = 'auth_token=test-token';

        await galleryHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const result = res.json.mock.calls[0][0];
        expect(result).toHaveLength(2);
        expect(result).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: 'Album 1' }),
                expect.objectContaining({ name: 'Album 2' }),
            ])
        );
        expect(result).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: 'Album 3' }),
            ])
        );
    });
  });

  describe('createAlbum', () => {
    it('should create a new album with visibleToGroups', async () => {
        const add = jest.fn(() => ({ id: 'new-album-id' }));
        const userDoc = {
            exists: true,
            data: () => ({ adminForGroups: ['group1'] }),
        };
        adminDb.collection.mockReturnValue({
            add,
            doc: jest.fn(() => ({
                get: jest.fn(() => userDoc),
            })),
        });
        jwt.verify.mockReturnValue({ roles: ['Group Admin'], userId: 'test-user-id' });
        req.method = 'POST';
        req.headers.cookie = 'auth_token=test-token';
        req.body = {
            title: 'New Album',
            description: 'A new album',
            visibleToGroups: ['group1'],
        };

        await galleryHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(add).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'New Album',
                description: 'A new album',
                visibleToGroups: ['group1'],
            })
        );
    });
  });
});
