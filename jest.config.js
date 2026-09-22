const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests', '<rootDir>/app', '<rootDir>/lib'],
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Mock problematic ES modules
  moduleNameMapper: {
    '^pdfjs-dist/build/pdf$': '<rootDir>/tests/mocks/pdf.js',
    '^pdfjs-dist$': '<rootDir>/tests/mocks/pdf.js',
    '^mammoth$': '<rootDir>/tests/mocks/mammoth.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(pdfjs-dist|mammoth)/)',
  ],
};

module.exports = createJestConfig(config);
