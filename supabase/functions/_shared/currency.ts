/**
 * Currency and precious metals utilities for Mahr Calculator
 * 
 * Fetches exchange rates from Fixer.io and gold/silver prices.
 * Implements 24-hour caching to minimize API calls.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const FIXER_API_KEY = Deno.env.get('FIXER_IO_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

export interface CurrencyRates {
  base: string
  rates: Record<string, number>
  goldPriceUsd: number | null
  silverPriceUsd: number | null
  lastUpdated: Date
}

// Fallback rates for when API is unavailable
const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  SAR: 3.75,
  AED: 3.67,
  PKR: 280,
  EGP: 30.9,
  GBP: 0.79,
  EUR: 0.92,
  MYR: 4.72,
  IDR: 15800,
  TRY: 30.5,
  CAD: 1.36,
  AUD: 1.53
}

const FALLBACK_GOLD_USD = 2050 // Per troy ounce
const FALLBACK_SILVER_USD = 24 // Per troy ounce

/**
 * Get cached currency rates from database
 */
export async function getCachedRates(): Promise<CurrencyRates | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return null
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data } = await supabase
    .from('currency_cache')
    .select('*')
    .gt('expires_at', new Date().toISOString())
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single()

  if (data) {
    return {
      base: data.base_currency,
      rates: data.rates as Record<string, number>,
      goldPriceUsd: data.gold_price_usd,
      silverPriceUsd: data.silver_price_usd,
      lastUpdated: new Date(data.fetched_at)
    }
  }

  return null
}

/**
 * Fetch fresh rates from external APIs
 */
export async function fetchFreshRates(): Promise<CurrencyRates> {
  const rates: Record<string, number> = { USD: 1 }
  let goldPrice: number | null = null
  let silverPrice: number | null = null

  // Fetch currency rates from Fixer.io
  if (FIXER_API_KEY) {
    try {
      const symbols = 'SAR,AED,PKR,EGP,GBP,EUR,MYR,IDR,TRY,CAD,AUD'
      const response = await fetch(
        `http://data.fixer.io/api/latest?access_key=${FIXER_API_KEY}&base=EUR&symbols=USD,${symbols}`
      )
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.success && data.rates) {
          // Convert EUR-based rates to USD-based
          const eurToUsd = data.rates.USD || 1.09
          
          for (const [currency, rate] of Object.entries(data.rates)) {
            if (currency !== 'USD') {
              rates[currency] = (rate as number) / eurToUsd
            }
          }
          
          console.log('[Currency] Fetched rates from Fixer.io')
        }
      }
    } catch (error) {
      console.error('[Currency] Fixer.io error:', error)
    }
  }

  // If Fixer failed, use fallback rates
  if (Object.keys(rates).length <= 1) {
    console.log('[Currency] Using fallback rates')
    Object.assign(rates, FALLBACK_RATES)
  }

  // Fetch gold/silver prices
  // Note: Kitco doesn't have a public API, so we use fallback values
  // In production, you'd integrate with a metals price API
  goldPrice = FALLBACK_GOLD_USD
  silverPrice = FALLBACK_SILVER_USD

  // Try to get more accurate prices from a free API
  try {
    // Using metals-api.com or similar service
    const metalsResponse = await fetch('https://api.metalpriceapi.com/v1/latest?api_key=demo&base=USD&currencies=XAU,XAG')
    if (metalsResponse.ok) {
      const metalsData = await metalsResponse.json()
      if (metalsData.success) {
        // XAU and XAG are in troy ounces per USD, need to invert
        if (metalsData.rates?.XAU) {
          goldPrice = 1 / metalsData.rates.XAU
        }
        if (metalsData.rates?.XAG) {
          silverPrice = 1 / metalsData.rates.XAG
        }
        console.log('[Currency] Fetched metals prices')
      }
    }
  } catch (error) {
    console.log('[Currency] Using fallback metals prices')
  }

  return {
    base: 'USD',
    rates,
    goldPriceUsd: goldPrice,
    silverPriceUsd: silverPrice,
    lastUpdated: new Date()
  }
}

/**
 * Save rates to cache
 */
export async function cacheRates(rates: CurrencyRates): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  await supabase
    .from('currency_cache')
    .insert({
      base_currency: rates.base,
      rates: rates.rates,
      gold_price_usd: rates.goldPriceUsd,
      silver_price_usd: rates.silverPriceUsd,
      fetched_at: rates.lastUpdated.toISOString(),
      expires_at: new Date(rates.lastUpdated.getTime() + 24 * 60 * 60 * 1000).toISOString()
    })
}

/**
 * Get current rates (cached or fresh)
 */
export async function getCurrentRates(): Promise<CurrencyRates> {
  // Try cache first
  const cached = await getCachedRates()
  if (cached) {
    return cached
  }

  // Fetch fresh rates
  const fresh = await fetchFreshRates()
  
  // Cache for future use
  await cacheRates(fresh)
  
  return fresh
}

/**
 * Convert amount between currencies
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>
): number {
  const fromRate = rates[fromCurrency] || 1
  const toRate = rates[toCurrency] || 1
  
  // Convert to USD first, then to target currency
  const usdAmount = amount / fromRate
  return usdAmount * toRate
}

/**
 * Calculate mahr in gold/silver equivalent
 */
export function calculateMahrInMetals(
  amountUsd: number,
  goldPriceUsd: number,
  silverPriceUsd: number
): { goldGrams: number; silverGrams: number } {
  // 1 troy ounce = 31.1035 grams
  const GRAMS_PER_OUNCE = 31.1035

  const goldGrams = (amountUsd / goldPriceUsd) * GRAMS_PER_OUNCE
  const silverGrams = (amountUsd / silverPriceUsd) * GRAMS_PER_OUNCE

  return {
    goldGrams: Math.round(goldGrams * 100) / 100,
    silverGrams: Math.round(silverGrams * 100) / 100
  }
}

/**
 * Get traditional Islamic mahr references in modern currency
 */
export function getIslamicMahrReferences(
  silverPriceUsd: number
): {
  minMahrSunnahUsd: number
  prophetsWivesMahrUsd: number
} {
  // 1 troy ounce = 31.1035 grams
  const GRAMS_PER_OUNCE = 31.1035

  // Minimum mahr according to Hanafi fiqh: 10 dirhams (approximately 30.618g of silver)
  const minMahrSilverGrams = 30.618
  const minMahrSunnahUsd = (minMahrSilverGrams / GRAMS_PER_OUNCE) * silverPriceUsd

  // Prophet's wives' mahr: 500 dirhams (approximately 1530.9g of silver)
  const prophetsWivesSilverGrams = 1530.9
  const prophetsWivesMahrUsd = (prophetsWivesSilverGrams / GRAMS_PER_OUNCE) * silverPriceUsd

  return {
    minMahrSunnahUsd: Math.round(minMahrSunnahUsd * 100) / 100,
    prophetsWivesMahrUsd: Math.round(prophetsWivesMahrUsd * 100) / 100
  }
}
