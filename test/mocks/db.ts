// Mock database for testing
export const db = {
  // User operations
  async getUser(userId: string) {
    return { id: userId, name: 'Test User', email: 'test@example.com' };
  },
  
  // Email operations
  async scheduleEmail(emailData: {
    userId: string;
    recipientEmail: string;
    subject: string;
    body: string;
    sendAt: Date;
  }) {
    return { id: 'test-email-id', ...emailData };
  },
  
  async getPendingEmails() {
    return [];
  },
  
  async markEmailAsSent(emailId: string) {
    return;
  }
}; 