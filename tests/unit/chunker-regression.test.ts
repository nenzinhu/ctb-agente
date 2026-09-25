import { chunkText } from '@/lib/ingestion/chunker';

describe('chunker regression: run-on text with no paragraph breaks', () => {
  it('never produces a chunk wildly larger than the target size', () => {
    // Simulates the pre-fix PDF extraction bug: one giant blob of text with
    // no \n\n paragraph breaks and only a handful of periods, all clustered
    // near the end — the scenario that produced a single oversized chunk
    // Mistral rejected with "Bad Request".
    const wallOfText =
      Array(2000).fill('palavra').join(' ') + '. ' + Array(50).fill('fim').join(' ') + '.';

    const chunks = chunkText(wallOfText, 500);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(500 * 4);
    }
  });
});
