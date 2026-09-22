// Unit tests for citation validator
import { validateCitations } from '@/lib/response/validator';

describe('Citation Validator', () => {
  it('should validate citations in response', () => {
    const response = 'Art. 165 proíbe o estacionamento...';
    const chunks = [{ numero_dispositivo: 'art. 165' }];
    const result = validateCitations(response, chunks);

    expect(result.valid).toBe(true);
    expect(result.issues.length).toBe(0);
  });

  it('should detect invalid citations', () => {
    const response = 'Art. 999 proíbe...';
    const chunks = [{ numero_dispositivo: 'art. 165' }];
    const result = validateCitations(response, chunks);

    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('should handle paragraph references', () => {
    const response = 'Art. 165 § 1º menciona...';
    const chunks = [{ numero_dispositivo: 'art. 165 § 1º' }];
    const result = validateCitations(response, chunks);

    expect(result.valid).toBe(true);
  });

  it('should handle multiple citations', () => {
    const response =
      'Art. 165 e Art. 181 estabelecem penalidades...';
    const chunks = [
      { numero_dispositivo: 'art. 165' },
      { numero_dispositivo: 'art. 181' },
    ];
    const result = validateCitations(response, chunks);

    expect(result.valid).toBe(true);
    expect(result.issues.length).toBe(0);
  });

  it('should handle mixed valid and invalid citations', () => {
    const response = 'Art. 165 e Art. 999 mencionam...';
    const chunks = [{ numero_dispositivo: 'art. 165' }];
    const result = validateCitations(response, chunks);

    expect(result.valid).toBe(false);
    expect(result.issues.length).toBe(1);
  });

  it('should handle empty response', () => {
    const response = '';
    const chunks = [{ numero_dispositivo: 'art. 165' }];
    const result = validateCitations(response, chunks);

    expect(result.valid).toBe(true);
    expect(result.issues.length).toBe(0);
  });

  it('should handle empty chunks', () => {
    const response = 'Art. 165 proíbe...';
    const chunks: any[] = [];
    const result = validateCitations(response, chunks);

    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});
