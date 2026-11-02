import { requestJson } from '@/lib/client/request';

describe('requestJson', () => {
  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
  it('returns JSON and preserves HTTP error payloads', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ value: 3 }) }).mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ message: 'Limite' }) });
    await expect(requestJson('/test')).resolves.toEqual({ value: 3 });
    await expect(requestJson('/test')).rejects.toMatchObject({ kind: 'http', status: 429, data: { message: 'Limite' } });
  });
  it('aborts a stalled fetch at the deadline', async () => {
    jest.useFakeTimers();
    let signal: AbortSignal | undefined;
    global.fetch = jest.fn((_input, init) => { signal = init?.signal as AbortSignal; return new Promise(() => {}); });
    const pending = expect(requestJson('/test', {}, 10)).rejects.toMatchObject({ kind: 'timeout' });
    await jest.advanceTimersByTimeAsync(10);
    await pending;
    expect(signal?.aborted).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  });
  it('bounds stalled JSON parsing and honors caller cancellation', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => new Promise(() => {}) });
    const pending = expect(requestJson('/test', {}, 10)).rejects.toMatchObject({ kind: 'timeout' });
    await jest.advanceTimersByTimeAsync(10); await pending;
    const controller = new AbortController();
    const cancelled = expect(requestJson('/test', { signal: controller.signal })).rejects.toMatchObject({ kind: 'aborted' });
    controller.abort(); await cancelled;
    expect(jest.getTimerCount()).toBe(0);
  });
  it('distinguishes network and invalid response failures', async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce({ ok: true, json: async () => { throw new SyntaxError(); } });
    await expect(requestJson('/test')).rejects.toMatchObject({ kind: 'network' });
    await expect(requestJson('/test')).rejects.toMatchObject({ kind: 'invalid-response' });
  });
});
