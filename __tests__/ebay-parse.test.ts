/**
 * Tests for eBay Parsing Library
 * Tests robust Cheerio-based parsing functions
 */

// Mock cheerio to avoid ES module issues
jest.mock('cheerio', () => ({
  load: jest.fn(() => ({
    find: jest.fn(() => ({
      each: jest.fn(),
      text: jest.fn(() => ''),
      hasClass: jest.fn(() => false),
      length: 0
    })),
    text: jest.fn(() => ''),
    hasClass: jest.fn(() => false)
  }))
}))

import { 
  parseActiveListings, 
  parseSoldListings, 
  validateParsedResults,
  EbayParseOptions 
} from '../lib/ebay-parse'

describe('eBay Parsing Library', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('parseActiveListings', () => {
    it('should handle empty HTML', () => {
      const result = parseActiveListings('')
      expect(result.count).toBe(0)
      expect(result.prices).toEqual([])
      expect(result.medianPrice).toBe(0)
      expect(result.items).toHaveLength(0)
    })

    it('should handle malformed HTML', () => {
      const result = parseActiveListings('<html><body></body></html>')
      expect(result.count).toBe(0)
      expect(result.prices).toEqual([])
      expect(result.medianPrice).toBe(0)
    })
  })

  describe('parseSoldListings', () => {
    it('should handle empty HTML', () => {
      const result = parseSoldListings('')
      expect(result.count).toBe(0)
      expect(result.prices).toEqual([])
      expect(result.medianPrice).toBe(0)
      expect(result.dates).toEqual([])
      expect(result.items).toHaveLength(0)
    })

    it('should handle malformed HTML', () => {
      const result = parseSoldListings('<html><body></body></html>')
      expect(result.count).toBe(0)
      expect(result.prices).toEqual([])
      expect(result.medianPrice).toBe(0)
    })

    it('should respect sold window days option', () => {
      const options: EbayParseOptions = { soldWindowDays: 7 }
      const result = parseSoldListings('<html></html>', options)
      expect(result.count).toBe(0)
    })
  })

  describe('validateParsedResults', () => {
    it('should validate empty results', () => {
      const emptyResult = parseActiveListings('')
      const validation = validateParsedResults(emptyResult)
      
      expect(validation.isValid).toBe(false)
      expect(validation.issues).toContain('No items found')
    })

    it('should validate results with no prices', () => {
      const noPriceResult = parseActiveListings('<html></html>')
      const validation = validateParsedResults(noPriceResult)
      
      expect(validation.isValid).toBe(false)
      expect(validation.issues).toContain('No valid prices found')
    })
  })

  describe('Edge Cases', () => {
    it('should handle null HTML', () => {
      const result = parseActiveListings(null as any)
      expect(result.count).toBe(0)
      expect(result.prices).toEqual([])
    })

    it('should handle undefined HTML', () => {
      const result = parseActiveListings(undefined as any)
      expect(result.count).toBe(0)
      expect(result.prices).toEqual([])
    })
  })
})
