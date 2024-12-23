import { IAsyncQueue, Result } from '@root/main/core/async-queue.interface';
import { RoundRobinScheduler } from '@root/main/core/schedulers/round-robin-scheduler';

describe('RoundRobinScheduler', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	const cases = [
		{
			description: '2 queues successful result (default timeouts)',
			results: [...Array(25).fill(Result.Success)],
			batchSize: 5,
			schedulerMaxConcurrentItems: 10,
			timeToAdvance: 59_900,
			expected: {
				queueOneCalls: 1,
				queueTwoCalls: 1,
			},
		},
		{
			description:
				'2 queues successful result, second round (default timeouts)',
			results: [...Array(25).fill(Result.Success)],
			batchSize: 5,
			schedulerMaxConcurrentItems: 10,
			timeToAdvance: 61_000,
			expected: {
				queueOneCalls: 2,
				queueTwoCalls: 2,
			},
		},
		{
			description:
				'2 queues successful result, all finished (default timeouts)',
			results: [...Array(25).fill(Result.Success)],
			batchSize: 5,
			schedulerMaxConcurrentItems: 10,
			timeToAdvance: 185_000,
			expected: {
				queueOneCalls: 4,
				queueTwoCalls: 4,
			},
		},
		{
			description: '2 queues successful result, all finished custom',
			results: [...Array(13).fill(Result.Success)],
			batchSize: 6,
			schedulerMaxConcurrentItems: 10,
			timeToAdvance: 59_000,
			expected: {
				queueOneCalls: 1,
				queueTwoCalls: 0,
			},
		},
		{
			description: '2 queues with large number of items',
			results: [...Array(100).fill(Result.Success)],
			batchSize: 10,
			schedulerMaxConcurrentItems: 20,
			timeToAdvance: 300_000,
			expected: {
				queueOneCalls: 6,
				queueTwoCalls: 6,
			},
		},
		{
			description: '2 queues with rate limited results',
			results: [Result.RateLimitExceeded, Result.RateLimitExceeded],
			batchSize: 5,
			schedulerMaxConcurrentItems: 10,
			timeToAdvance: 61_000,
			expected: {
				queueOneCalls: 1,
				queueTwoCalls: 1,
			},
		},
	];

	cases.forEach(
		({
			description,
			results,
			timeToAdvance,
			expected,
			schedulerMaxConcurrentItems,
			batchSize,
		}) => {
			it(`Should schedule queue processing with ${description}`, async () => {
				const queue = (
					jest.fn() as jest.Mock<IAsyncQueue<{ id: number }>>
				).mockImplementation(() => {
					return {
						batchSize: batchSize,
						queueSize: batchSize,
						add: jest.fn(),
						process: jest.fn().mockImplementation(() => {
							return Promise.resolve(results.shift());
						}),
					};
				});

				const queueOne = queue();
				const queueTwo = queue();

				const scheduler = new RoundRobinScheduler(
					[queueOne, queueTwo],
					schedulerMaxConcurrentItems,
				);
				scheduler.initialize();

				await jest.advanceTimersByTimeAsync(timeToAdvance);
				expect(queueOne.process).toHaveBeenCalledTimes(expected.queueOneCalls);
				expect(queueTwo.process).toHaveBeenCalledTimes(expected.queueTwoCalls);
			});
		},
	);
});
