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
    console.log("Scheduled streak reset running...");
    try {
      await performStreakReset(env);
      console.log("Scheduled streak reset completed successfully");
    } catch (error) {
      console.error("Scheduled streak reset failed:", error instanceof Error ? error.message : String(error));
      console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    }

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

    if (path === '/trigger') {
      try {
        console.log("Manual streak reset triggered");
        await performStreakReset(env);
        console.log("Manual streak reset completed successfully");
        return new Response('Streak reset triggered successfully', { status: 200 });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorDetails = JSON.stringify(error, Object.getOwnPropertyNames(error));
        console.error('Error during manual trigger:', errorMessage);
        console.error('Error details:', errorDetails);
        return new Response(`Error during streak reset: ${errorMessage}`, { status: 500 });
      }
    } else if (path === '/test-user') {
      const userId = url.searchParams.get('user_id');
      if (!userId) {
        return new Response('Missing user_id parameter', { status: 400 });
      }
      try {
        console.log(`Testing streak reset for user: ${userId}`);
        const result = await testUserStreakReset(userId, env);
        console.log(`Test result for user ${userId}:`, result);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error during test-user for ${userId}:`, errorMessage);
        console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        return new Response(`Error during test: ${errorMessage}`, { status: 500 });
      }
    } else if (path === '/test-all') {
      try {
        console.log("Testing streak reset for all users");
        const results = await testAllUsersStreakReset(env);
        console.log(`Test results for all users: ${results.length} users checked`);
        return new Response(JSON.stringify(results), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error during test-all:', errorMessage);
        console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        return new Response(`Error during test: ${errorMessage}`, { status: 500 });
      }
    } else if (path === '/sync-resend') {
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
    } else {
      return new Response('Not found', { status: 404 });
    }
  },
};

// Perform the actual streak reset (modifies the database)
async function performStreakReset(env: Env) {
  console.log("Starting streak reset process");
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  try {
    console.log("Connected to database, adding timezone column if needed");
    // Add timezone column if it doesn't exist
    await pool.query(`
      ALTER TABLE user_profile
      ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Los_Angeles';
    `);
    console.log("Timezone column check completed");

    console.log("Creating or replacing reset_streaks function");
    // Create or replace the reset_streaks function
    await pool.query(`
      CREATE OR REPLACE FUNCTION reset_streaks() RETURNS void AS $$
        UPDATE user_progress up
        SET current_streak = 0
        FROM user_profile prof
        WHERE up.user_id = prof.user_id
          AND up.current_streak > 0
          AND (NOW() AT TIME ZONE prof.timezone)::time >= '01:00:00'
          AND (up.last_attempt_date AT TIME ZONE prof.timezone)::date < (NOW() AT TIME ZONE prof.timezone)::date - INTERVAL '1 day'
      $$ LANGUAGE sql;
    `);
    console.log("Reset function created successfully");

    // Execute the streak reset
    console.log("Executing streak reset");
    const result = await pool.query('SELECT reset_streaks();');
    console.log("Streaks reset successfully", result);
  } catch (error) {
    console.error("Error in performStreakReset:", error instanceof Error ? error.message : String(error));
    throw error; // Re-throw to be handled by the caller
  } finally {
    console.log("Closing database connection");
    await pool.end();
  }
}

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

// Test if a specific user's streak should be reset (ignores timezones, no DB modification)
async function testUserStreakReset(userId: string, env: Env) {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  try {
    console.log(`Testing if user ${userId} streak should be reset`);
    const result = await pool.query(`
      SELECT 
        EXISTS (
          SELECT 1
          FROM user_progress up
          JOIN user_profile prof ON up.user_id = prof.user_id
          WHERE up.user_id = $1
            AND up.current_streak > 0
            AND NOW()::time >= '01:00:00'
            AND up.last_attempt_date::date < NOW()::date - INTERVAL '1 day'
        ) as should_reset
    `, [userId]);

    return { should_reset: result.rows[0].should_reset };
  } catch (error) {
    console.error(`Error in testUserStreakReset for ${userId}:`, error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    await pool.end();
  }
}

// Test all users and return whether their streaks should be reset (ignores timezones, no DB modification)
async function testAllUsersStreakReset(env: Env) {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  try {
    console.log("Testing streak reset for all users");
    const result = await pool.query(`
      SELECT 
        prof.email,
        CASE 
          WHEN up.current_streak > 0 
               AND NOW()::time >= '01:00:00'
               AND up.last_attempt_date::date < NOW()::date - INTERVAL '1 day'
          THEN true
          ELSE false
        END as should_reset
      FROM user_progress up
      JOIN user_profile prof ON up.user_id = prof.user_id
    `);

    console.log(`Found ${result.rows.length} users to check for streak reset`);
    return result.rows;
  } catch (error) {
    console.error("Error in testAllUsersStreakReset:", error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    await pool.end();
  }
}