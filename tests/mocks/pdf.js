// Mock for pdfjs-dist to avoid import.meta errors in Jest.
//
// getDocument({ data }) mirrors the real library's strict input check: it
// rejects a Node Buffer even though Buffer is technically a Uint8Array
// subclass, because pdf.js checks the exact constructor. Reproducing that
// here is what let tests/unit/parser.test.ts catch lib/ingestion/parser.ts
// passing fs.readFileSync's Buffer straight through.
module.exports = {
  getDocument: jest.fn(({ data } = {}) => ({
    promise:
      Buffer.isBuffer(data)
        ? Promise.reject(
            new Error('Please provide binary data as `Uint8Array`, rather than `Buffer`.'),
          )
        : Promise.resolve({
            numPages: 1,
            getPage: jest.fn(() =>
              Promise.resolve({
                getTextContent: jest.fn(() =>
                  Promise.resolve({
                    items: [{ str: 'Mock PDF text' }],
                  }),
                ),
              }),
            ),
          }),
  })),
  GlobalWorkerOptions: {
    workerSrc: undefined,
  },
  version: '3.0.0',
};
