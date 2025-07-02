module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.[tj]sx?$': 'babel-jest'
  },
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],
  transformIgnorePatterns: [
    '/node_modules/(?!(react-pdf|@react-pdf|pdfjs-dist)/)'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
};
