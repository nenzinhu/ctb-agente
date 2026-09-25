// Mock for mammoth to avoid issues in Jest
module.exports = {
  extractRawText: jest.fn((options) =>
    Promise.resolve({
      value: 'Mock DOCX text',
      messages: [],
    }),
  ),
};
