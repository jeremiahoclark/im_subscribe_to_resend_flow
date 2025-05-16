import { Pool } from '@neondatabase/serverless';
import { Resend } from 'resend';

// Define environment variables
interface Env {
  DATABASE_URL: string;
  RESEND_API_KEY: string;
  RESEND_AUDIENCE_ID: string;
}

// Scheduled event to reset streaks hourly and sync Resend
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // Also run Resend sync
    console.log("Scheduled Resend sync running...");
    try {
      await syncUsersToResend(env);
      console.log("Scheduled Resend sync completed successfully");
    } catch (error) {
      console.error("Scheduled Resend sync failed:", error instanceof Error ? error.message : String(error));
      console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    }
  },

  // Handle HTTP requests
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/sync-resend') {
      try {
        console.log("Manual Resend sync triggered");
        await syncUsersToResend(env);
        console.log("Manual Resend sync completed successfully");
        return new Response('Resend sync triggered successfully', { status: 200 });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorDetails = JSON.stringify(error, Object.getOwnPropertyNames(error));
        console.error('Error during manual Resend sync trigger:', errorMessage);
        console.error('Error details:', errorDetails);
        return new Response(`Error during Resend sync: ${errorMessage}`, { status: 500 });
      }
    } else if (path === '/') {
      return new Response(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Manual Resend Sync</title>
  <style>
    body { font-family: sans-serif; margin: 2em; }
    button { font-size: 1.2em; padding: 0.5em 1.5em; }
    #result { margin-top: 1em; }
  </style>
</head>
<body>
  <h1>Manual Resend Sync</h1>
  <button id="run-btn">Run Migration</button>
  <div id="result"></div>
  <script>
    document.getElementById('run-btn').onclick = async () => {
      const btn = document.getElementById('run-btn');
      const result = document.getElementById('result');
      btn.disabled = true;
      result.textContent = 'Running...';
      try {
        const resp = await fetch('/sync-resend');
        const text = await resp.text();
        result.textContent = text;
      } catch (e) {
        result.textContent = 'Error: ' + e;
      }
      btn.disabled = false;
    };
  </script>
</body>
</html>`, {
        headers: { 'Content-Type': 'text/html' },
      });
    } else {
      return new Response('Not found', { status: 404 });
    }
  },
};

// Sync users to Resend audience
async function syncUsersToResend(env: Env) {
  console.log("Starting Resend sync process");
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  if (!env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY environment variable is not set");
  }
  if (!env.RESEND_AUDIENCE_ID) {
    throw new Error("RESEND_AUDIENCE_ID environment variable is not set");
  }

  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const resend = new Resend(env.RESEND_API_KEY);

  try {
    // Step 1: Copy active users from user_profile to email_subscribers if they don't exist
    console.log("Copying active users to email_subscribers table...");
    await pool.query(`
      INSERT INTO email_subscribers (email)
      SELECT email FROM user_profile
      WHERE email_subscription = 'active' AND email IS NOT NULL AND email != ''
      ON CONFLICT (email) DO NOTHING;
    `);
    console.log("User copy complete.");

    // Step 2: Identify subscribers to add to Resend
    console.log("Fetching subscribers to add to Resend...");
    const subscribersToAddResult = await pool.query(`
      SELECT sub.id, sub.email, prof.first_name, prof.last_name
      FROM email_subscribers sub
      JOIN user_profile prof ON sub.email = prof.email
      WHERE sub.added_to_resend_at IS NULL
        AND sub.has_unsubscribed = false
        AND prof.email_subscription = 'active' -- Ensure profile is still active
    `);

    const subscribersToAdd = subscribersToAddResult.rows;
    console.log(`Found ${subscribersToAdd.length} subscribers to add to Resend.`);

    // Step 3: Add to Resend and update database
    let addedCount = 0;
    let errorCount = 0;
    for (const subscriber of subscribersToAdd) {
      try {
        console.log(`Adding ${subscriber.email} to Resend audience ${env.RESEND_AUDIENCE_ID}...`);
        const { data, error } = await resend.contacts.create({
          audienceId: env.RESEND_AUDIENCE_ID,
          email: subscriber.email,
          firstName: subscriber.first_name || '', // Resend requires firstName, provide empty string if null
          lastName: subscriber.last_name || '',   // Provide empty string if null
          unsubscribed: false, // Explicitly set as not unsubscribed
        });

        if (error) {
          console.error(`Failed to add ${subscriber.email} to Resend:`, error);
          errorCount++;
          // Optionally: Mark as failed in DB? For now, we just log and skip timestamp update.
        } else {
          console.log(`Successfully added ${subscriber.email} to Resend (Contact ID: ${data?.id}). Updating database...`);
          // Update the added_to_resend_at timestamp
          await pool.query(`
            UPDATE email_subscribers
            SET added_to_resend_at = NOW()
            WHERE id = $1;
          `, [subscriber.id]);
          addedCount++;
        }
      } catch (err) {
        errorCount++;
        console.error(`Error processing subscriber ${subscriber.email}:`, err instanceof Error ? err.message : String(err));
      }
    }
    console.log(`Resend sync summary: ${addedCount} added, ${errorCount} errors.`);

  } catch (error) {
    console.error("Error in syncUsersToResend:", error instanceof Error ? error.message : String(error));
    throw error; // Re-throw to be handled by the caller
  } finally {
    console.log("Closing database connection for Resend sync");
    await pool.end();
  }
}

// Test all users and return whether their streaks should be reset (ignores timezones, no DB modification)
// REMOVED: testAllUsersStreakReset function