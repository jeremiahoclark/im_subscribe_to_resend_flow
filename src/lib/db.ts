import { neon } from '@neondatabase/serverless';

// Initialize the Neon client
const sql = neon(process.env.DATABASE_URL || '');

// Database interface
export const db = {
  // User operations
  async getUser(userId: string) {
    const result = await sql`SELECT * FROM "user" WHERE id = ${userId}`;
    return result[0] || null;
  },
  
  // Email operations
  async scheduleEmail(emailData: {
    userId: string;
    recipientEmail: string;
    subject: string;
    body: string;
    sendAt: Date;
  }) {
    const { userId, recipientEmail, subject, body, sendAt } = emailData;
    const result = await sql`
      INSERT INTO scheduled_email (user_id, recipient_email, subject, body, send_at, created_at)
      VALUES (${userId}, ${recipientEmail}, ${subject}, ${body}, ${sendAt}, NOW())
      RETURNING *
    `;
    return result[0];
  },
  
  async getPendingEmails() {
    const now = new Date();
    const result = await sql`
      SELECT * FROM scheduled_email 
      WHERE send_at <= ${now} AND sent_at IS NULL
    `;
    return result;
  },
  
  async markEmailAsSent(emailId: string) {
    const now = new Date();
    await sql`
      UPDATE scheduled_email
      SET sent_at = ${now}
      WHERE id = ${emailId}
    `;
  }
}; 