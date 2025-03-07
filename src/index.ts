import { Pool } from 'pg';

export default {
  // Scheduled event to reset streaks hourly
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log("Scheduled streak reset running...");
    await performStreakReset(env);
  },

  // Handle HTTP requests
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/trigger') {
      // Manual trigger to run the streak reset
      try {
        await performStreakReset(env);
        return new Response('Streak reset triggered successfully', { status: 200 });
      } catch (error) {
        console.error('Error during manual trigger:', error);
        return new Response('Error during streak reset', { status: 500 });
      }
    } else if (path === '/test-user') {
      // Test endpoint for a specific user
      const userId = url.searchParams.get('user_id');
      if (!userId) {
        return new Response('Missing user_id parameter', { status: 400 });
      }
      try {
        const result = await testUserStreakReset(userId, env);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('Error during test-user:', error);
        return new Response('Error during test', { status: 500 });
      }
    } else if (path === '/test-all') {
      // Test endpoint for all users
      try {
        const results = await testAllUsersStreakReset(env);
        return new Response(JSON.stringify(results), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('Error during test-all:', error);
        return new Response('Error during test', { status: 500 });
      }
    } else {
      return new Response('Not found', { status: 404 });
    }
  },
};

// Perform the actual streak reset (modifies the database)
async function performStreakReset(env: Env) {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Add timezone column if it doesn’t exist
    await pool.query(`
      ALTER TABLE user_profile
      ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Los_Angeles';
    `);

    // Create or replace the reset_streaks function
    await pool.query(`
      CREATE OR REPLACE FUNCTION reset_streaks() RETURNS void AS $$
        UPDATE "UserProgress" up
        SET current_streak = 0
        FROM user_profile prof
        WHERE up.user_id = prof.user_id
          AND up.current_streak > 0
          AND (NOW() AT TIME ZONE prof.timezone)::time >= '01:00:00'
          AND (up.last_attempt_date AT TIME ZONE prof.timezone)::date < (NOW() AT TIME ZONE prof.timezone)::date - INTERVAL '1 day'
      $$ LANGUAGE sql;
    `);

    // Execute the streak reset
    await pool.query('SELECT reset_streaks();');
    console.log("Streaks reset successfully");
  } finally {
    await pool.end();
  }
}

// Test if a specific user’s streak should be reset (ignores timezones, no DB modification)
async function testUserStreakReset(userId: string, env: Env) {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const result = await pool.query(`
      SELECT 
        EXISTS (
          SELECT 1
          FROM "UserProgress" up
          JOIN user_profile prof ON up.user_id = prof.user_id
          WHERE up.user_id = $1
            AND up.current_streak > 0
            AND NOW()::time >= '01:00:00'
            AND up.last_attempt_date::date < NOW()::date - INTERVAL '1 day'
        ) as should_reset
    `, [userId]);

    return { should_reset: result.rows[0].should_reset };
  } finally {
    await pool.end();
  }
}

// Test all users and return whether their streaks should be reset (ignores timezones, no DB modification)
async function testAllUsersStreakReset(env: Env) {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
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
      FROM "UserProgress" up
      JOIN user_profile prof ON up.user_id = prof.user_id
    `);

    return result.rows;
  } finally {
    await pool.end();
  }
}