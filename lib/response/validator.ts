// Citation validation logic
export interface CitationValidation {
  valid: boolean;
  issues: string[];
}

/**
 * Validate that citations in response text actually exist in retrieved chunks
 * Prevents hallucinated references to non-existent articles
 * @param responseText - Generated response text
 * @param retrievedChunks - Array of chunks retrieved from database
 * @returns Validation result with any issues found
 */
export function validateCitations(
  responseText: string,
  retrievedChunks: any[]
): CitationValidation {
  const issues: string[] = [];
  const citationRegex =
    /art\.?\s*(\d+)(?:\s*§\s*(\d+))?(?:\s*(?:inciso|inc|i|III|IV|V|VI|VII|VIII|IX|X))?/gi;

  const citations = [...responseText.matchAll(citationRegex)];

  for (const [match, artNum, parNum] of citations) {
    const articleKey = `art. ${artNum}${parNum ? ` § ${parNum}` : ''}`;
    const found = retrievedChunks.some((chunk) =>
      chunk.numero_dispositivo.includes(articleKey)
    );

    if (!found) {
      issues.push(`Citation not found: "${match.trim()}"`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
