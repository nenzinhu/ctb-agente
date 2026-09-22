// Mock for pdfjs-dist to avoid import.meta errors in Jest
module.exports = {
  getDocument: jest.fn(() => ({
    promise: Promise.resolve({
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
