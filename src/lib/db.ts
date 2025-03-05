import { neon } from '@neondatabase/serverless';

// Create a function to initialize the database connection
// This lets us inject the DATABASE_URL from the env parameter
let sqlClient: any = null;

function getSql(databaseUrl?: string) {
  if (!sqlClient) {
    // For local development or tests, allow fallback to a default connection string
    const connectionString = databaseUrl || 'postgresql://test:test@localhost:5432/test';
    sqlClient = neon(connectionString);
  }
  return sqlClient;
}

// Database interface
export const db = {
  // User operations
  async getUser(userId: string, env?: Env) {
    const sql = getSql(env?.DATABASE_URL);
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
  }, env?: Env) {
    const sql = getSql(env?.DATABASE_URL);
    const { userId, recipientEmail, subject, body, sendAt } = emailData;
    const result = await sql`
      INSERT INTO scheduled_email (user_id, recipient_email, subject, body, send_at, created_at)
      VALUES (${userId}, ${recipientEmail}, ${subject}, ${body}, ${sendAt}, NOW())
      RETURNING *
    `;
    return result[0];
  },
  
  async getPendingEmails(env?: Env) {
    const sql = getSql(env?.DATABASE_URL);
    const now = new Date();
    const result = await sql`
      SELECT * FROM scheduled_email 
      WHERE send_at <= ${now} AND sent = false
    `;
    return result;
  },
  
  async markEmailAsSent(emailId: string, env?: Env) {
    const sql = getSql(env?.DATABASE_URL);
    await sql`
      UPDATE scheduled_email
      SET sent = true, updated_at = NOW()
      WHERE id = ${emailId}
    `;
  },

  // Test operations
  async createTestUser(env?: Env) {
    const sql = getSql(env?.DATABASE_URL);
    try {
      // Check if the test user already exists
      const existing = await sql`SELECT * FROM "user" WHERE email = 'jeremiahoclark@gmail.com'`;
      if (existing.length > 0) {
        return existing[0];
      }
      
      // Create a test user with a UUID
      const result = await sql`
        INSERT INTO "user" (name, email, created_at, updated_at)
        VALUES ('Jeremiah Clark', 'jeremiahoclark@gmail.com', NOW(), NOW())
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('Error creating test user:', error);
      throw error;
    }
  }
}; 