import { countries } from "./country-data"

export function getUserLocale(): string {
  if (typeof window !== "undefined") {
    return navigator.language || "en-US"
  }
  return "en-US"
}

export function getLocalCurrency(): {
  currency: string
  currencySymbol: string
  exchangeRate: number
} {
  const locale = getUserLocale()
  const regionCode = locale.split("-")[1] || "US"

  // Find country by region code
  const country = countries.find((c) => c.code === regionCode)

  if (country) {
    return {
      currency: country.currency,
      currencySymbol: country.currencySymbol,
      exchangeRate: country.piToLocalRate / 314159,
    }
  }

  // Default to USD
  return {
    currency: "USD",
    currencySymbol: "$",
    exchangeRate: 1,
  }
}

export function formatLocalCurrency(amount: number): string {
  const { currencySymbol, exchangeRate } = getLocalCurrency()
  const localAmount = amount * exchangeRate
  return `${currencySymbol}${localAmount.toLocaleString(getUserLocale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
