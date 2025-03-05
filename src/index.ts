import { db } from './lib/db';

/**
 * Schedule an email to be sent at a specific time
 */
export async function scheduleEmail({
  userId,
  recipientEmail,
  subject,
  body,
  sendAt,
}: {
  userId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  sendAt: Date;
}): Promise<void> {
  await db.scheduleEmail({
    userId,
    recipientEmail,
    subject,
    body,
    sendAt,
  });
}

/**
 * Schedule the welcome email series for a user
 * This function schedules follow-up emails (days 1-7), not the initial welcome email
 * 
 * @param userId - The ID of the user
 * @param name - The name of the user
 * @param email - The email of the user
 * @param test - Whether to run in test mode (default: false)
 */
export async function scheduleWelcomeEmailSeries(
  userId: string,
  name: string,
  email: string,
  test: boolean = false
): Promise<void> {
  try {
    // Override email and name in test mode
    const recipientEmail = test ? 'interviewmaster.ai@gmail.com' : email;
    const firstName = test ? 'Jay' : name.split(' ')[0];

    // Define the email series (days 1-7)
    const emailSeries = [
      {
        subject: "The hardest part of learning SQL",
        body: getDayTwoEmailContent(firstName),
        timeOffset: test ? 30 : 1 * 24 * 60 * 60, // 30 seconds or 1 day
      },
      {
        subject: "The only SQL learning roadmap you need",
        body: getDayThreeEmailContent(firstName),
        timeOffset: test ? 60 : 2 * 24 * 60 * 60, // 60 seconds or 2 days
      },
      {
        subject: "My SQL interview framework",
        body: getDayFourEmailContent(firstName),
        timeOffset: test ? 90 : 3 * 24 * 60 * 60, // 90 seconds or 3 days
      },
      {
        subject: "How to master SQL",
        body: getDayFiveEmailContent(firstName),
        timeOffset: test ? 120 : 4 * 24 * 60 * 60, // 120 seconds or 4 days
      },
      {
        subject: "Stand out in a SQL interview",
        body: getDaySixEmailContent(firstName),
        timeOffset: test ? 150 : 5 * 24 * 60 * 60, // 150 seconds or 5 days
      },
      {
        subject: "The only way to get good at SQL",
        body: getDaySevenEmailContent(firstName),
        timeOffset: test ? 180 : 6 * 24 * 60 * 60, // 180 seconds or 6 days
      },
      {
        subject: "What would help you learn SQL faster?",
        body: getDayEightEmailContent(firstName),
        timeOffset: test ? 210 : 7 * 24 * 60 * 60, // 210 seconds or 7 days
      },
    ];

    // Schedule each email in the series
    for (let i = 0; i < emailSeries.length; i++) {
      const emailData = emailSeries[i];
      const sendAt = new Date();
      sendAt.setSeconds(sendAt.getSeconds() + emailData.timeOffset); // Offset in seconds or days

      await scheduleEmail({
        userId,
        recipientEmail,
        subject: emailData.subject,
        body: emailData.body,
        sendAt,
      });

      // Add a 2.5-second delay between scheduling to avoid rate limits
      if (i < emailSeries.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2500));
      }
    }
  } catch (error) {
    console.error('Error scheduling welcome email series:', error);
    throw error;
  }
}

/**
 * Placeholder functions for email content
 * These would typically return full HTML content in a real implementation
 */
export function getDayTwoEmailContent(firstName: string): string {
  return `
    <h2>The hardest part of learning SQL</h2>
    <h3>And how to overcome it 💪</h3>
    
    <p>The hardest part of learning SQL?</p>
    
    <p>It's not memorizing syntax.</p>
    
    <p>It's not figuring which JOIN to use.</p>
    
    <p>It's not those darn window functions.</p>
    
    <p>It's applying SQL to a real-business problem.</p>
    
    <p>Because we don't want to write queries for the sake it.</p>
    
    <p>SQL is only useful when it helps answer real questions and drive decisions.</p>
    
    <p>So how do you get better at applying SQL?</p>
    
    <p>✓ Read tech blogs, like this one from <a href="http://netflixtechblog.com/">Netflix</a></p>
    
    <p>✓ Build projects using real-world datasets</p>
    
    <p>✓ Practice on <a href="http://InterviewMaster.AI">InterviewMaster.AI</a></p>
    
    <p>- Dawn & Jay</p>
    
    <p>Want fewer emails? <a href="https://interviewmaster.ai/unsubscribe?email=${encodeURIComponent(firstName)}">You can unsubscribe here</a>.</p>
  `;
}

export function getDayThreeEmailContent(firstName: string): string {
  return `
    <h2>The only SQL learning roadmap you need</h2>
    <h3>Save this for later 🔖</h3>
    
    <p>We (Dawn & Jay) have both worked in Data roles at big tech companies.</p>
    
    <p>But if we were learning SQL from scratch, here's the roadmap that we would follow.</p>
    
    <p><strong>1. Start with basic SQL syntax</strong></p>
    
    <p>→ Writing simple SELECT statements</p>
    
    <p>→ Using WHERE to filter data</p>
    
    <p>→ Sorting with ORDER BY</p>
    
    <p>... etc</p>
    
    <p><strong>2. Learn Data Cleaning and Filtering</strong></p>
    
    <p>→ Using DISTINCT to remove duplicates</p>
    
    <p>→ Filtering with multiple conditions</p>
    
    <p>→ Using BETWEEN and IN for range filtering</p>
    
    <p>... etc</p>
    
    <p><strong>3. Advance to Data Aggregation</strong></p>
    
    <p>→ Common aggregate functions</p>
    
    <p>→ Grouping data with GROUP BY</p>
    
    <p>→ Filtering grouped data using HAVING</p>
    
    <p>... etc</p>
    
    <p><strong>4. Master Combining Tables</strong></p>
    
    <p>→ Understanding different types of joins</p>
    
    <p>→ Using CROSS JOIN for Cartesian products</p>
    
    <p>... etc</p>
    
    <p><strong>5. Uplevel Your Skills with Window Functions</strong></p>
    
    <p>→ Basics of window functions using OVER</p>
    
    <p>→ Partitioning data using PARTITION BY</p>
    
    <p>→ Window frames for precise calculations</p>
    
    <p>... etc</p>
    
    <p><strong>6. Focus on Subqueries and CTEs</strong></p>
    
    <p>→ Simple and correlated subqueries</p>
    
    <p>→ Writing CTEs using WITH</p>
    
    <p>... etc</p>
    
    <p><strong>7. Finally, Learn Data Manipulation</strong></p>
    
    <p>→ INSERT data into tables</p>
    
    <p>→ UPDATE existing records</p>
    
    <p>→ DELETE records from a table</p>
    
    <p>... etc</p>
    
    <p><strong>8. For Bonus Points — Query Optimization</strong></p>
    
    <p>→ Using indexes effectively</p>
    
    <p>→ Understanding execution plans</p>
    
    <p>→ Optimizing joins and subqueries</p>
    
    <p>... etc</p>
    
    <p>For the full roadmap, check out this article on <a href="http://InterviewMaster.AI/">InterviewMaster.AI</a> <!-- TODO: Add actual article link --></p>
    
    <p>Ready to level up? Practice on <a href="http://interviewmaster.ai/">InterviewMaster.AI</a>.</p>
    
    <p>Want fewer emails? <a href="https://interviewmaster.ai/unsubscribe?email=${encodeURIComponent(firstName)}">You can unsubscribe here</a>.</p>
  `;
}

export function getDayFourEmailContent(firstName: string): string {
  return `
    <h2>My SQL interview framework</h2>
    <h3>This landed me offers at Meta, Google, Amazon & more.</h3>
    
    <p>Here's the 6-step framework I use in every SQL interview.</p>
    
    <p>It helped me land Data Science offers from multiple MAANG companies — and it can help you too.</p>
    
    <p><strong>1. Reframe the question & ask clarifying questions</strong></p>
    
    <p>Confirm your understanding of the question by reframing in your <em>own</em> words.</p>
    
    <p><strong>2. State assumptions you have about the data</strong></p>
    
    <p>Identify primary and foreign keys, determine whether events can repeat, and check for unique values, etc…</p>
    
    <p><strong>3. Outline your approach and methodology</strong></p>
    
    <p>Before touching SQL, lay out your plan for the question.</p>
    
    <p>Confirm your approach with your interviewer before moving on.</p>
    
    <p><strong>4. Fill in your SQL query (talking aloud)</strong></p>
    
    <p>This is now the easy part… because we've already locked in our approach.</p>
    
    <p><strong>5. Review your query: catch any errors</strong></p>
    
    <p><em>Please don't skip this step.</em> Even small mistakes can <strong>cost you the offer</strong>.</p>
    
    <p><strong>6. Suggestions to improve the query</strong></p>
    
    <p>Show that you're a thought leader, not a data monkey.</p>
    
    <p>You might consider:</p>
    
    <p>✓ Performance optimization</p>
    
    <p>✓ Alternative solutions</p>
    
    <p>✓ Business context</p>
    
    <p>Want to put this to the test? Practice with your AI interview at <a href="http://InterviewMaster.AI">InterviewMaster.AI</a>.</p>
    
    <p>Check out the full article here. <!-- TODO: Add actual article link --></p>
    
    <p>- Dawn</p>
    
    <p>Want fewer emails? <a href="https://interviewmaster.ai/unsubscribe?email=${encodeURIComponent(firstName)}">You can unsubscribe here</a>.</p>
  `;
}

export function getDayFiveEmailContent(firstName: string): string {
  return `
    <h2>How to master SQL</h2>
    <h3>The secret to getting really good</h3>
    
    <p>SQL is easy to learn but difficult to master.</p>
    
    <p>Here are 5 ways to level up your SQL skills — fast.</p>
    
    <p>🔹 <strong>Know complex joins</strong></p>
    
    <p>LEFT, RIGHT, INNER, and OUTER JOINs? That's the easy stuff.</p>
    
    <p>To truly master SQL, you must also know:</p>
    
    <p>Anti joins, self joins, cartesian joins and multi-table joins</p>
    
    <p>🔹 <strong>Master Window functions</strong></p>
    
    <p>Essential for advanced analytics in SQL.</p>
    
    <p>They let you do a lot of the "Python magic" directly in SQL.</p>
    
    <p>🔹 <strong>Explore alternative solutions</strong></p>
    
    <p>There's always more than one way to solve a problem in SQL.</p>
    
    <p>Flex your creative, problem-solving skills by finding "other" solutions.</p>
    
    <p>🔹 <strong>Optimize your queries</strong></p>
    
    <p>Faster = better.</p>
    
    <p>Not always true in life.</p>
    
    <p>But it's always true in SQL.</p>
    
    <p>🔹 <strong>Understand ETL</strong></p>
    
    <p>Data moves through Extract → Transform → Load.</p>
    
    <p>Knowing ETL will take your SQL skills to the moon.</p>
    
    <p>————————————</p>
    
    <p>Ready to level up your SQL skills? Check out <a href="http://InterviewMaster.AI">InterviewMaster.AI</a>.</p>
    
    <p>We're rooting for you!</p>
    
    <p>-Dawn & Jay</p>
    
    <p>Want fewer emails? <a href="https://interviewmaster.ai/unsubscribe?email=${encodeURIComponent(firstName)}">You can unsubscribe here</a>.</p>
  `;
}

export function getDaySixEmailContent(firstName: string): string {
  return `
    <h2>Stand out in a SQL interview</h2>
    <h3>Differentiate yourself from the crowd</h3>
    
    <p>SQL interviews are fun!</p>
    
    <p>I say that unironically. I actually really enjoy them.</p>
    
    <p><em>Them: "Nerd."</em></p>
    
    <p><em>Me: "You called?"</em></p>
    
    <p>Anyway, I digress.</p>
    
    <p>Here's how to stand out and prove you're better than the rest:</p>
    
    <p><em><strong>*drumroll*</strong></em> <strong>Be self-critical</strong></p>
    
    <p>At the end of each query, take a moment to review your work.</p>
    
    <p>Answer one of these questions:</p>
    
    <p>✔️ What are some edge cases that might break this query?</p>
    
    <p>✔️ What are some ways to make this query more efficient?</p>
    
    <p>✔️ What are some potential downsides of this query?</p>
    
    <p>Yes, you want to criticize your own work.</p>
    
    <p>Because <strong>that</strong> is how you show off your expertise.</p>
    
    <p>- Dawn & Jay</p>
    
    <p>Want more SQL practice? Head to <a href="http://InterviewMaster.AI">InterviewMaster.AI</a> to start practicing now.</p>
    
    <p>Want fewer emails? <a href="https://interviewmaster.ai/unsubscribe?email=${encodeURIComponent(firstName)}">You can unsubscribe here</a>.</p>
  `;
}

export function getDaySevenEmailContent(firstName: string): string {
  return `
    <h2>The only way to get good at SQL</h2>
    <h3>👀</h3>
    
    <p>The only way to get good at SQL… is to get a lot of practice in.</p>
    
    <p>What's a lot of practice?</p>
    
    <p>Malcolm Gladwell says 10,000 hours.</p>
    
    <p>We say 10,000 SQL questions.</p>
    
    <p>Don't know where to find that many SQL questions?</p>
    
    <p>We don't either.</p>
    
    <p>But we have over 200+ SQL interview questions on <a href="http://InterviewMaster.AI">InterviewMaster.AI</a>.</p>
    
    <p>That's a good place to start.</p>
    
    <p>-Dawn & Jay</p>
    
    <p>Want fewer emails? <a href="https://interviewmaster.ai/unsubscribe?email=${encodeURIComponent(firstName)}">You can unsubscribe here</a>.</p>
  `;
}

export function getDayEightEmailContent(firstName: string): string {
  return `
    <h2>What would help you learn SQL faster?</h2>
    <h3>We'd love to hear your advice.</h3>
    
    <p>It's been a <strong>week</strong> since you joined <a href="http://interviewmaster.ai/">InterviewMaster.AI</a>!</p>
    
    <p>Wherever you are in your SQL journey, we'd love to get your advice.</p>
    
    <p>If you could wave a magic wand and get anything to make SQL interview prep easier…</p>
    
    <p>What's the one thing you wish you had?</p>
    
    <p>Reply to this email and let us know — we read every response!</p>
    
    <p>Thank you for being a part of our Interview Master community 🙌</p>
    
    <p>-Dawn & Jay</p>
    
    <p><em>Want fewer emails?</em> <a href="https://interviewmaster.ai/unsubscribe?email=${encodeURIComponent(firstName)}">You can unsubscribe here</a>.</p>
  `;
}