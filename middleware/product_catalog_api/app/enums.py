from enum import StrEnum


class AssetClass(StrEnum):
    EQUITY = "Equity"
    FIXED_INCOME = "Fixed Income"
    MULTI_ASSET = "Multi-Asset"
    ALTERNATIVE = "Alternative"
    CASH = "Cash"
    COMMODITY = "Commodity"
    REAL_ESTATE = "Real Estate"


class ProductType(StrEnum):
    MUTUAL_FUND = "Mutual Fund"
    ETF = "ETF"
    BOND = "Bond"
    STRUCTURED = "Structured Product"
    INVESTMENT_ACCOUNT = "Investment Account"
    PENSION = "Pension"
    ANNUITY = "Annuity"
    INSURANCE = "Insurance"
    MONEY_MARKET = "Money Market"
    PRIVATE_EQUITY = "Private Equity"
    REIT = "REIT"


class TimeHorizon(StrEnum):
    SHORT = "Short"
    MEDIUM = "Medium"
    LONG = "Long"


class Liquidity(StrEnum):
    DAILY = "Daily"
    WEEKLY = "Weekly"
    MONTHLY = "Monthly"
    QUARTERLY = "Quarterly"
    LOCKED = "Locked"


class CustomerSegment(StrEnum):
    HIGH_WEALTH_PROSPECT = "High-Wealth-Prospect"
    MID_TIER_SAVER = "Mid-Tier-Saver"
    YOUNG_INVESTOR = "Young-Investor"
    PASSIVE_HOLDER = "Passive-Holder"
    AT_RISK_ABANDONER = "At-Risk-Abandoner"
    RETIREMENT_PLANNER = "Retirement-Planner"


class EsgRating(StrEnum):
    AAA = "AAA"
    AA = "AA"
    A = "A"
    BBB = "BBB"
    BB = "BB"
    B = "B"
    CCC = "CCC"
    NOT_RATED = "Not Rated"


class Geography(StrEnum):
    GLOBAL = "Global"
    UK = "UK"
    US = "US"
    EUROPE = "Europe"
    ASIA_PACIFIC = "Asia-Pacific"
    EMERGING_MARKETS = "Emerging Markets"
    JAPAN = "Japan"
    CHINA = "China"
    INDIA = "India"
    FRONTIER = "Frontier Markets"
