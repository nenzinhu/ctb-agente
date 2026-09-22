// pdfjs-dist ships this module but doesn't publish types for it — it's only
// meant to be handed to PDFWorker internals, which is exactly how
// lib/ingestion/parser.ts uses it (see the comment there for why).
declare module 'pdfjs-dist/legacy/build/pdf.worker.mjs' {
  export const WorkerMessageHandler: unknown;
}
