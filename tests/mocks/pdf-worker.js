// Mock for pdfjs-dist/legacy/build/pdf.worker.mjs — parser.ts imports this
// only to register WorkerMessageHandler on globalThis.pdfjsWorker; the real
// value is never invoked by tests/mocks/pdf.js's getDocument.
module.exports = {
  WorkerMessageHandler: { setup: jest.fn() },
};
