import { IAsyncQueue, Result } from '@root/main/core/async-queue.interface';
import { SimpleScheduler } from '@root/main/core/schedulers/simple-scheduler';

describe('SimpleScheduler', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	const cases = [
		{
			description: 'successful result (default timeouts)',
			results: [Result.Success, Result.Success, Result.Success, Result.Success],
			timeToAdvance: 59_900,
			expectedCalls: 4,
		},
		{
			description: 'rate limit exceeded result (default timeouts)',
			results: [Result.Success, Result.RateLimitExceeded, Result.Success],
			timeToAdvance: 80_000,
			expectedCalls: 3,
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
