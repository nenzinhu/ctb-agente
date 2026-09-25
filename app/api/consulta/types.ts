// Types for /api/consulta endpoint
import { z } from 'zod';

/**
 * Request schema for consultation endpoint
 * @example { "consulta": "516-91", "turnstileToken": "..." }
 */
export const ConsultaRequestSchema = z.object({
  consulta: z.string().min(3).max(1000),
  turnstileToken: z.string().optional(),
});

export type ConsultaRequest = z.infer<typeof ConsultaRequestSchema>;
