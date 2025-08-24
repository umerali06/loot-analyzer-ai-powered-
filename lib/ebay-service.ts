/**
 * eBay Service for marketplace integration using ScraperAPI
 * Handles real-time product search, pricing, and market analysis
 * Now uses robust Cheerio-based parsing instead of fragile regex
 */

import { ScrapedEbayData } from '../types';
import { 
  parseActiveListings, 
  parseSoldListings, 
  ParsedListing,
  validateParsedResults 
} from './simple-html-parser';
import { filterOutliersSmart, calculateWeightedMarketValue } from './stats';
import { EnhancedScraperService } from './scraper-service';

export class EbayService {
  private scraperService: EnhancedScraperService;

  constructor(apiKey?: string) {
    this.scraperService = new EnhancedScraperService(apiKey || process.env.SCRAPER_API_KEY || '');
  }

  async getItemEbayData(
    itemName: string, 
    itemDetails?: any, 
    options: { soldWindowDays?: number; categoryHint?: string; } = {}
  ): Promise<ScrapedEbayData> {
    const { soldWindowDays = 30, categoryHint } = options;
    
    try {
      // Generate search queries
      const searchQueries = this.generateSearchQueries(itemName, itemDetails, categoryHint);
      
      // Get active listings
      const activeListings = await this.getActiveListings(searchQueries[0], options);
      
      // Get sold items within the specified window
      const soldListings = await this.getSoldItems(searchQueries[0], { ...options, soldWindowDays });
      
      // Calculate statistics
      const statistics = this.calculateStatistics(activeListings, soldListings);
      
      // Calculate market value
      const marketValueResult = calculateWeightedMarketValue(
        [...activeListings.map(l => l.price), ...soldListings.map(l => l.price)].filter(p => p > 0)
      );
      const marketValue = marketValueResult.value;
      
      // Determine if outliers were filtered
      const outlierFiltered = statistics.outlierCount > 0;
      
      return {
        title: itemName,
        activeCount: activeListings.length,
        medianActivePrice: this.calculateMedian(activeListings.map(l => l.price)),
        soldCount: soldListings.length,
        medianSoldPrice: this.calculateMedian(soldListings.map(l => l.price)),
        marketValue,
        ebayLinks: {
          active: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchQueries[0])}`,
          sold: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchQueries[0])}&_sop=16&LH_Sold=1&LH_Complete=1`
        },
        searchQuery: searchQueries[0],
        lastUpdated: new Date().toISOString(),
        outlierFiltered,
        soldWindowDays,
        statistics
      };
    } catch (error) {
      console.error('Error getting eBay data:', error);
      throw new Error(`Failed to get eBay data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getActiveListings(searchQuery: string, options: any = {}): Promise<ParsedListing[]> {
    try {
      const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchQuery)}`;
      const result = await this.scraperService.scrapeUrl(url);
      
      if (!result.success || !result.html) {
        console.warn('No HTML content received for active listings');
        return [];
      }
      
      const listings = parseActiveListings(result.html, options);
      const validation = validateParsedResults(listings);
      
      if (!validation.isValid) {
        console.warn('Active listings validation issues:', validation.issues);
      }
      
      return listings;
    } catch (error) {
      console.error('Error getting active listings:', error);
      return [];
    }
  }

  private async getSoldItems(searchQuery: string, options: any = {}): Promise<ParsedListing[]> {
    try {
      const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchQuery)}&_sop=16&LH_Sold=1&LH_Complete=1`;
      const result = await this.scraperService.scrapeUrl(url);
      
      if (!result.success || !result.html) {
        console.warn('No HTML content received for sold listings');
        return [];
      }
      
      const listings = parseSoldListings(result.html, options);
      const validation = validateParsedResults(listings);
      
      if (!validation.isValid) {
        console.warn('Sold listings validation issues:', validation.issues);
      }
      
      return listings;
    } catch (error) {
      console.error('Error getting sold listings:', error);
      return [];
    }
  }

  private calculateStatistics(activeListings: ParsedListing[], soldListings: ParsedListing[]) {
    const activePrices = activeListings.map(l => l.price).filter(p => p > 0);
    const soldPrices = soldListings.map(l => l.price).filter(p => p > 0);
    
    // Filter outliers
    const outlierResult = filterOutliersSmart([...activePrices, ...soldPrices]);
    const outlierCount = outlierResult.outliers.length;
    
    // Calculate confidence based on data quality
    const totalPrices = outlierResult.filteredPrices.length;
    const confidence = totalPrices > 0 ? Math.min(0.95, 0.5 + (totalPrices * 0.01)) : 0.5;
    
    // Get sold dates for sold listings
    const soldDates = soldListings
      .filter(l => l.soldDate)
      .map(l => l.soldDate!)
      .slice(0, 10); // Limit to recent 10
    
    return {
      activePrices: outlierResult.filteredPrices.filter((p: number) => activePrices.includes(p)),
      soldPrices: outlierResult.filteredPrices.filter((p: number) => soldPrices.includes(p)),
      outlierCount,
      confidence,
      soldDates,
      outlierMethod: outlierResult.method
    };
  }

  private calculateMedian(prices: number[]): number {
    if (prices.length === 0) return 0;
    if (prices.length === 1) return prices[0];
    
    const sorted = [...prices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  private generateSearchQueries(itemName: string, itemDetails?: any, categoryHint?: string): string[] {
    const queries: string[] = [];
    
    // Base query
    queries.push(itemName);
    
    // Add category-specific variations
    if (categoryHint) {
      queries.push(`${categoryHint} ${itemName}`);
      queries.push(`${itemName} ${categoryHint}`);
    }
    
    // Add general variations
    queries.push(`"${itemName}"`);
    queries.push(`${itemName} lot`);
    queries.push(`${itemName} bundle`);
    
    // Add condition variations
    queries.push(`${itemName} new`);
    queries.push(`${itemName} used`);
    
    return queries.slice(0, 5); // Limit to 5 queries
  }
}

