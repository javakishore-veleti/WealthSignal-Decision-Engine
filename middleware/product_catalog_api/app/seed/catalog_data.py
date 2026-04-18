"""
Small reference dictionaries used to programmatically generate wealth-management
products. These are short curated lists (all under ~40 entries); the 10,000
products themselves are NEVER hardcoded here — they are produced at runtime by
`generate_products.py` combining these values with Faker and weighted random
sampling.
"""

from __future__ import annotations

# Well-known asset managers and UK/US wealth providers.
ISSUERS: list[str] = [
    "BlackRock",
    "Vanguard",
    "Fidelity International",
    "Schroders",
    "Jupiter Asset Management",
    "Legal & General",
    "M&G Investments",
    "HSBC Asset Management",
    "Lloyds Private Banking",
    "NatWest Invest",
    "Barclays Wealth",
    "Invesco",
    "iShares",
    "SPDR",
    "State Street",
    "Aberdeen",
    "Royal London",
    "Aviva Investors",
    "Standard Life",
    "Prudential",
    "JPMorgan Asset Management",
    "Goldman Sachs Asset Management",
    "Morgan Stanley Investment Management",
    "T. Rowe Price",
    "PIMCO",
    "Nordea",
    "BNP Paribas Asset Management",
    "UBS Asset Management",
    "Amundi",
    "Allianz Global Investors",
]

STYLES: list[str] = [
    "Growth",
    "Value",
    "Blend",
    "Income",
    "Dividend",
    "Quality",
    "Momentum",
    "Small-Cap",
    "Mid-Cap",
    "Large-Cap",
    "Core",
    "Aggressive Growth",
    "Conservative",
    "Balanced",
    "Thematic",
    "ESG Leaders",
    "Impact",
    "Sustainable",
]

SECTORS: list[str] = [
    "Technology",
    "Healthcare",
    "Financial Services",
    "Energy",
    "Consumer Staples",
    "Consumer Discretionary",
    "Industrials",
    "Utilities",
    "Materials",
    "Communications",
    "Infrastructure",
    "Clean Energy",
    "Biotech",
    "Artificial Intelligence",
    "Cybersecurity",
    "Robotics",
    "Real Estate",
    "Precious Metals",
]

ACCOUNT_WRAPPERS: list[str] = [
    "Stocks & Shares ISA",
    "Junior ISA",
    "Lifetime ISA",
    "Cash ISA",
    "SIPP",
    "Personal Pension",
    "Workplace Pension",
    "General Investment Account",
    "Trust Account",
    "Joint Investment Account",
]

BOND_TYPES: list[str] = [
    "UK Gilt",
    "US Treasury",
    "Corporate Bond",
    "High-Yield Bond",
    "Inflation-Linked Bond",
    "Emerging Market Debt",
    "Municipal Bond",
    "Green Bond",
    "Convertible Bond",
]

TAG_POOL: list[str] = [
    "tax-efficient",
    "retirement",
    "first-time-investor",
    "high-net-worth",
    "esg",
    "sustainable",
    "income",
    "capital-growth",
    "low-cost",
    "actively-managed",
    "passively-managed",
    "inflation-hedge",
    "diversified",
    "thematic",
    "global",
    "uk-domiciled",
    "us-domiciled",
    "distribution",
    "accumulation",
    "platform-compatible",
]
