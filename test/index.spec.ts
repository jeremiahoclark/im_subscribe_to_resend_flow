// test/index.spec.ts
import { describe, it, expect } from 'vitest';
import * as worker from '../src/index';

describe('Email Scheduler', () => {
	it('exports necessary functions', () => {
		// Check that the main functions are exported
		expect(typeof worker.scheduleEmail).toBe('function');
		expect(typeof worker.scheduleWelcomeEmailSeries).toBe('function');
		
		// Check that email content functions are exported
		expect(typeof worker.getDayTwoEmailContent).toBe('function');
		expect(typeof worker.getDayThreeEmailContent).toBe('function');
		expect(typeof worker.getDayFourEmailContent).toBe('function');
		expect(typeof worker.getDayFiveEmailContent).toBe('function');
		expect(typeof worker.getDaySixEmailContent).toBe('function');
		expect(typeof worker.getDaySevenEmailContent).toBe('function');
		expect(typeof worker.getDayEightEmailContent).toBe('function');
	});
});
