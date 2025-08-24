/**
 * Mock for node-fetch module
 * Provides a simple fetch implementation for testing
 */

const mockFetch = async (url, options = {}) => {
  // Return a mock response
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    text: async () => '<html><body>Mock HTML content</body></html>',
    json: async () => ({ mock: 'data' }),
    headers: new Map(),
    url: url
  }
}

module.exports = mockFetch
module.exports.default = mockFetch
