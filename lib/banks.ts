export type Bank = {
  name: string
  swift: string
  feePercent: number
  minDelayHours: number
  maxDelayHours: number
}

export const banksByCountry: Record<string, Bank[]> = {
  CD: [
    {
      name: "Rawbank",
      swift: "RAWBCDKI",
      feePercent: 1.5,
      minDelayHours: 1,
      maxDelayHours: 4,
    },
    {
      name: "Equity BCDC",
      swift: "EQBLCDKI",
      feePercent: 1.2,
      minDelayHours: 1,
      maxDelayHours: 3,
    },
    {
      name: "Trust Merchant Bank",
      swift: "TMBLCDKI",
      feePercent: 1.8,
      minDelayHours: 2,
      maxDelayHours: 6,
    },
  ],
}
