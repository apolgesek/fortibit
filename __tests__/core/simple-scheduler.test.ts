import { IAsyncQueue, Result } from '@root/main/core/async-queue.interface';
import { SimpleScheduler } from '@root/main/core/schedulers/simple-scheduler';

describe('SimpleScheduler', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	const cases = [
		{
			description: 'successful result',
			results: [Result.Success, Result.Success, Result.Success, Result.Success],
			timeToAdvance: 59_900,
			expectedCalls: 4,
		},
		{
			description: 'rate limit exceeded result',
			results: [Result.Success, Result.RateLimitExceeded, Result.Success],
			timeToAdvance: 80_000,
			expectedCalls: 3,
		},
		{
			description: 'consecutive rate limit exceeded result',
			results: [
				Result.Success, // 15s
				Result.RateLimitExceeded, // 65s
				Result.RateLimitExceeded, // 125s
			],
			timeToAdvance: 204_000,
			expectedCalls: 3,
		},
		{
			description:
				'consecutive rate limit exceeded result after successful result',
			results: [
				Result.RateLimitExceeded, // 65s
				Result.Success, // 15s
				Result.RateLimitExceeded, // 65s
				Result.RateLimitExceeded, // 125s
				Result.RateLimitExceeded, // 245s
			],
			timeToAdvance: 514_000,
			expectedCalls: 5,
		},
		{
			description: 'failed result',
			results: [Result.Failed, Result.Failed, Result.Failed, Result.Failed],
			timeToAdvance: 59_900,
			expectedCalls: 4,
		},
	];

	cases.forEach(({ description, results, timeToAdvance, expectedCalls }) => {
		it(`Should schedule queue processing with ${description}`, async () => {
			const queue = (
				jest.fn() as jest.Mock<IAsyncQueue<{ id: number }>>
			).mockImplementation(() => {
				return {
					batchSize: 5,
					queueSize: 5,
					add: jest.fn(),
					process: jest.fn().mockImplementation(() => {
						return Promise.resolve(results.shift());
					}),
				};
			});

			const testQueue = queue();

			const scheduler = new SimpleScheduler(testQueue);
			scheduler.initialize();

			await jest.advanceTimersByTimeAsync(timeToAdvance);
			expect(testQueue.process).toHaveBeenCalledTimes(expectedCalls);
		});
	});
});
