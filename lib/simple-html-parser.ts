/**
 * Simple HTML parser for eBay listings
 * Lightweight alternative to cheerio that avoids ES module issues
 */

export interface ParsedListing {
  price: number;
  shipping: number;
  location: string;
  condition: string;
  soldDate?: string;
}

export interface ParseOptions {
  soldWindowDays?: number;
  maxResults?: number;
}

/**
 * Extract number from text using regex
 */
export function extractNumberFromText(text: string): number {
  const match = text.match(/[\d,]+\.?\d*/);
  if (match) {
    return parseFloat(match[0].replace(/,/g, ''));
  }
  return 0;
}

/**
 * Extract price from text
 */
export function extractPrice(text: string): number {
  const priceMatch = text.match(/\$[\d,]+\.?\d*/);
  if (priceMatch) {
    return parseFloat(priceMatch[0].replace(/[$,]/g, ''));
  }
  return 0;
}

/**
 * Extract shipping cost from text
 */
export function extractShipping(text: string): number {
  const shippingMatch = text.match(/shipping.*?\$[\d,]+\.?\d*/i);
  if (shippingMatch) {
    return extractPrice(shippingMatch[0]);
  }
  return 0;
}

/**
 * Parse active listings from HTML text
 */
export function parseActiveListings(html: string, options: ParseOptions = {}): ParsedListing[] {
  const listings: ParsedListing[] = [];
  
  // Simple regex-based parsing
  const listingMatches = html.match(/<div[^>]*class="[^"]*s-item[^"]*"[^>]*>.*?<\/div>/gs);
  
  if (listingMatches) {
    for (const match of listingMatches.slice(0, options.maxResults || 50)) {
      try {
        const price = extractPrice(match);
        const shipping = extractShipping(match);
        const location = extractLocation(match);
        const condition = extractCondition(match);
        
        if (price > 0) {
          listings.push({ price, shipping, location, condition });
        }
      } catch (error) {
        // Skip malformed listings
        continue;
      }
    }
  }
  
  return listings;
}

/**
 * Parse sold listings from HTML text
 */
export function parseSoldListings(html: string, options: ParseOptions = {}): ParsedListing[] {
  const listings: ParsedListing[] = [];
  
  // Simple regex-based parsing for sold items
  const soldMatches = html.match(/<div[^>]*class="[^"]*s-item[^"]*"[^>]*>.*?<\/div>/gs);
  
  if (soldMatches) {
    for (const match of soldMatches.slice(0, options.maxResults || 50)) {
      try {
        const price = extractPrice(match);
        const shipping = extractShipping(match);
        const location = extractLocation(match);
        const condition = extractCondition(match);
        const soldDate = extractSoldDate(match);
        
        if (price > 0) {
          listings.push({ price, shipping, location, condition, soldDate });
        }
      } catch (error) {
        // Skip malformed listings
        continue;
      }
    }
  }
  
  return listings;
}

/**
 * Extract location from HTML
 */
function extractLocation(html: string): string {
  const locationMatch = html.match(/location[^>]*>([^<]+)</i);
  return locationMatch ? locationMatch[1].trim() : 'Unknown';
}

/**
 * Extract condition from HTML
 */
function extractCondition(html: string): string {
  const conditionMatch = html.match(/condition[^>]*>([^<]+)</i);
  return conditionMatch ? conditionMatch[1].trim() : 'Used';
}

/**
 * Extract sold date from HTML
 */
function extractSoldDate(html: string): string {
  const dateMatch = html.match(/sold[^>]*>([^<]+)</i);
  return dateMatch ? dateMatch[1].trim() : '';
}

/**
 * Validate parsed results
 */
export function validateParsedResults(listings: ParsedListing[]): {
  isValid: boolean;
  count: number;
  averagePrice: number;
  issues: string[];
} {
  const issues: string[] = [];
  
  if (listings.length === 0) {
    issues.push('No listings found');
  }
  
  const prices = listings.map(l => l.price).filter(p => p > 0);
  const averagePrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  
  if (prices.length === 0) {
    issues.push('No valid prices found');
  }
  
  return {
    isValid: issues.length === 0,
    count: listings.length,
    averagePrice,
    issues
  };
}
