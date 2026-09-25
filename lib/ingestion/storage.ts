// Shared between the two document-upload routes. Next.js route modules may
// only export recognized handlers (GET, POST, ...) plus a small allow-list
// of config values, so this constant can't live in either route.ts file.
export const DOCUMENTS_BUCKET = 'documentos-pendentes';
