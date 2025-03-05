import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import worker from '../src/index';
import { db } from '../src/lib/db';

// Mock the database methods
vi.mock('../src/lib/db', () => ({
  db: {
    getPendingEmails: vi.fn(),
    markEmailAsSent: vi.fn()
  }
}));

describe('Cron Scheduler', () => {
  // Spy on console.log to verify output
  const consoleSpy = vi.spyOn(console, 'log');
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should process pending emails when triggered by cron', async () => {
    // Setup mock email data
    const mockEmails = [
      { 
        id: 'email-1', 
        user_id: 'user-1',
        recipient_email: 'test1@example.com',
        subject: 'Test Subject 1',
        body: 'Test Body 1',
        send_at: new Date()
      },
      { 
        id: 'email-2', 
        user_id: 'user-2',
        recipient_email: 'test2@example.com',
        subject: 'Test Subject 2',
        body: 'Test Body 2',
        send_at: new Date()
      }
    ];
    
    // Mock the getPendingEmails to return our test data
    vi.mocked(db.getPendingEmails).mockResolvedValue(mockEmails);
    
    // Create a mock scheduled event
    const mockEvent = {
      cron: '*/1 * * * *',
      scheduledTime: Date.now(),
      // Add other properties if necessary...
    } as unknown as ScheduledEvent;
    
    // Create mock execution context
    const mockCtx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn()
    } as unknown as ExecutionContext;
    
    // Call the scheduled function as if triggered by cron
    await worker.scheduled(mockEvent, {} as Env, mockCtx);
    
    // Verify the database queries were called
    expect(db.getPendingEmails).toHaveBeenCalledTimes(1);
    expect(db.markEmailAsSent).toHaveBeenCalledTimes(2);
    expect(db.markEmailAsSent).toHaveBeenCalledWith('email-1');
    expect(db.markEmailAsSent).toHaveBeenCalledWith('email-2');
    
    // Verify the logs
    expect(consoleSpy).toHaveBeenCalledWith('Email scheduler running...');
    expect(consoleSpy).toHaveBeenCalledWith(`Sending email to test1@example.com with subject: Test Subject 1`);
    expect(consoleSpy).toHaveBeenCalledWith(`Sending email to test2@example.com with subject: Test Subject 2`);
    expect(consoleSpy).toHaveBeenCalledWith('Processed 2 emails');
  });
  
  it('should handle empty pending emails', async () => {
    // Mock the getPendingEmails to return empty array
    vi.mocked(db.getPendingEmails).mockResolvedValue([]);
    
    // Create a mock scheduled event
    const mockEvent = {
      cron: '*/1 * * * *',
      scheduledTime: Date.now(),
    } as unknown as ScheduledEvent;
    
    // Create mock execution context
    const mockCtx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn()
    } as unknown as ExecutionContext;
    
    // Call the scheduled function as if triggered by cron
    await worker.scheduled(mockEvent, {} as Env, mockCtx);
    
    // Verify the database query was called
    expect(db.getPendingEmails).toHaveBeenCalledTimes(1);
    expect(db.markEmailAsSent).not.toHaveBeenCalled();
    
    // Verify the logs
    expect(consoleSpy).toHaveBeenCalledWith('Email scheduler running...');
    expect(consoleSpy).toHaveBeenCalledWith('Processed 0 emails');
  });
  
  it('should handle errors during processing', async () => {
    // Spy on console.error
    const consoleErrorSpy = vi.spyOn(console, 'error');
    
    // Mock the getPendingEmails to throw an error
    vi.mocked(db.getPendingEmails).mockRejectedValue(new Error('Database error'));
    
    // Create a mock scheduled event
    const mockEvent = {
      cron: '*/1 * * * *',
      scheduledTime: Date.now(),
    } as unknown as ScheduledEvent;
    
    // Create mock execution context
    const mockCtx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn()
    } as unknown as ExecutionContext;
    
    // Call the scheduled function as if triggered by cron
    await worker.scheduled(mockEvent, {} as Env, mockCtx);
    
    // Verify error was logged
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error processing scheduled emails:', expect.any(Error));
  });
}); 