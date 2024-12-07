import { AsyncQueue } from '@root/main/core/async-queue';
import { Result } from '@root/main/core/async-queue.interface';

function createItems(length: number): { id: number }[] {
	return Array.from({ length }, (_, i) => ({ id: i }));
}

describe('Async queue', () => {
	const cases = [
		[{ items: createItems(3), queueSize: 5, maxRetries: 3, expectedSize: 0 }],
		[{ items: createItems(10), queueSize: 5, maxRetries: 3, expectedSize: 5 }],
	];
	test.each(cases)(
		'Should execute all tasks in the queue successfully',
		async (testCase) => {
			const queue = new AsyncQueue(
				(item) => Promise.resolve(item),
				(_, value: { id: number }) =>
					console.log(`Processed item with value ${value.id}`),
				testCase.queueSize,
				testCase.maxRetries,
			);

			testCase.items.forEach((item) => queue.add(item));

			const result = await queue.process();

			expect(result).toEqual(Result.Success);
			expect(queue.queueSize).toEqual(testCase.expectedSize);
		},
	);

	test('Should reject with rate limit exceeded result', async () => {
		const queue = new AsyncQueue(
			(item: { code: number }) =>
				item.code === 200
					? Promise.resolve(item)
					: Promise.reject({ code: 429 }),
			(_, value: { code: number }) =>
				console.log(`Processed item with value ${value.code}`),
			5,
			3,
		);
		const items = [{ code: 200 }, { code: 200 }, { code: 429 }];

		items.forEach((item) => queue.add(item));

		const result = await queue.process();

		expect(result).toEqual(Result.RateLimitExceeded);
		expect(queue.queueSize).toEqual(1);
	});

	test('Should not retry promise after max attempts limit exceeded', async () => {
		const queue = new AsyncQueue(
			(item: { code: number }) =>
				item.code === 200
					? Promise.resolve(item)
					: Promise.reject({ code: 429 }),
			(_, value: { code: number }) =>
				console.log(`Processed item with value ${value.code}`),
			5,
			3,
		);
		const items = [{ code: 200 }, { code: 200 }, { code: 429 }];

		items.forEach((item) => queue.add(item));

		await queue.process();
		await queue.process();

		expect(queue.queueSize).toEqual(1);
		await queue.process();

		expect(queue.queueSize).toEqual(0);
	});
});
