import { describe, it, expect } from 'vitest';
import { 
  getDayTwoEmailContent,
  getDayThreeEmailContent,
  getDayFourEmailContent,
  getDayFiveEmailContent,
  getDaySixEmailContent,
  getDaySevenEmailContent,
  getDayEightEmailContent
} from '../src/index';

describe('Email Content Functions', () => {
  const firstName = 'Test';
  
  it('should generate correct content for Day Two email', () => {
    const content = getDayTwoEmailContent(firstName);
    expect(content).toContain('<h2>The hardest part of learning SQL</h2>');
    expect(content).toContain(`You can unsubscribe here</a>.`);
  });
  
  it('should generate correct content for Day Three email', () => {
    const content = getDayThreeEmailContent(firstName);
    expect(content).toContain('<h2>The only SQL learning roadmap you need</h2>');
    expect(content).toContain('1. Start with basic SQL syntax');
    expect(content).toContain('8. For Bonus Points — Query Optimization');
  });
  
  it('should generate correct content for Day Four email', () => {
    const content = getDayFourEmailContent(firstName);
    expect(content).toContain('<h2>My SQL interview framework</h2>');
    expect(content).toContain('6-step framework');
    expect(content).toContain('land Data Science offers');
  });
  
  it('should generate correct content for Day Five email', () => {
    const content = getDayFiveEmailContent(firstName);
    expect(content).toContain('<h2>How to master SQL</h2>');
    expect(content).toContain('5 ways to level up your SQL skills');
    expect(content).toContain('Master Window functions');
  });
  
  it('should generate correct content for Day Six email', () => {
    const content = getDaySixEmailContent(firstName);
    expect(content).toContain('<h2>Stand out in a SQL interview</h2>');
    expect(content).toContain('SQL interviews are fun');
    expect(content).toContain('Be self-critical');
  });
  
  it('should generate correct content for Day Seven email', () => {
    const content = getDaySevenEmailContent(firstName);
    expect(content).toContain('<h2>The only way to get good at SQL</h2>');
    expect(content).toContain('get a lot of practice in');
    expect(content).toContain('10,000 SQL questions');
  });
  
  it('should generate correct content for Day Eight email', () => {
    const content = getDayEightEmailContent(firstName);
    expect(content).toContain('<h2>What would help you learn SQL faster?</h2>');
    expect(content).toContain('It\'s been a <strong>week</strong>');
    expect(content).toContain('Reply to this email');
  });
}); 