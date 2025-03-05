import { vi } from 'vitest';

// Mock environment variables
vi.stubEnv('DATABASE_URL', 'postgresql://test:test@test.com/test');

// Mock the Neon database client
vi.mock('@neondatabase/serverless', () => ({
  neon: vi.fn(() => async (query: any, ...params: any[]) => {
    return [];
  }),
}));

// Mock the database in src/lib/db.ts
vi.mock('../src/lib/db', () => {
  return {
    db: {
      scheduleEmail: vi.fn().mockResolvedValue({}),
      getUser: vi.fn().mockResolvedValue({ id: 'test-user-id', name: 'Test User', email: 'test@example.com' }),
      getPendingEmails: vi.fn().mockResolvedValue([]),
      markEmailAsSent: vi.fn().mockResolvedValue(undefined),
    }
  };
});

// Mock the scheduleEmail function to avoid timeouts
vi.mock('../src/index', async (importOriginal) => {
  const originalModule = await importOriginal<typeof import('../src/index')>();
  
  return {
    ...originalModule,
    scheduleEmail: vi.fn().mockResolvedValue(undefined)
  };
}); 