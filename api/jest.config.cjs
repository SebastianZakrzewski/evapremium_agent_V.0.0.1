/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  roots: ['<rootDir>/../tests/api'],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@api/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'node',
};
