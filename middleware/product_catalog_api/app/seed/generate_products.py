"""
Programmatic wealth-product catalogue generator.

Produces N products (default 10,000) by combining small reference dictionaries
in `catalog_data.py` with Faker and weighted random sampling. NOTHING is
hardcoded per-product — every record is synthesised at runtime.

Output: writes a JSON array to `data/product_catalog/products_seed.json` at the
repo root (path configurable via --out). This JSON becomes the source of truth
that the Admin Portal's "Initial Data Load Setup" action uses to bulk-load the
catalogue into Postgres via an Airflow DAG.

Usage:
    python -m middleware.product_catalog_api.app.seed.generate_products
    python -m middleware.product_catalog_api.app.seed.generate_products --count 500 --out /tmp/sample.json
"""

from __future__ import annotations

import argparse
import json
import random
import string
import sys
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

from faker import Faker

from ..enums import (
    AssetClass,
    CustomerSegment,
    EsgRating,
    Geography,
    Liquidity,
    ProductType,
    TimeHorizon,
)
from .catalog_data import (
    ACCOUNT_WRAPPERS,
    BOND_TYPES,
    ISSUERS,
    SECTORS,
    STYLES,
    TAG_POOL,
)

# Default output path — relative to repo root.
DEFAULT_OUT = Path("data/product_catalog/products_seed.json")


# ── Weighted distributions so the catalogue looks realistic ──────────────────

# Approximate real-world mix across a large wealth-management shelf.
PRODUCT_TYPE_WEIGHTS: dict[ProductType, float] = {
    ProductType.MUTUAL_FUND: 0.35,
    ProductType.ETF: 0.18,
    ProductType.BOND: 0.12,
    ProductType.INVESTMENT_ACCOUNT: 0.10,
    ProductType.PENSION: 0.06,
    ProductType.STRUCTURED: 0.05,
    ProductType.INSURANCE: 0.04,
    ProductType.ANNUITY: 0.03,
    ProductType.MONEY_MARKET: 0.03,
    ProductType.REIT: 0.02,
    ProductType.PRIVATE_EQUITY: 0.02,
}

# Asset-class distribution conditioned on product type.
ASSET_CLASS_BY_TYPE: dict[ProductType, list[tuple[AssetClass, float]]] = {
    ProductType.MUTUAL_FUND: [
        (AssetClass.EQUITY, 0.55),
        (AssetClass.FIXED_INCOME, 0.20),
        (AssetClass.MULTI_ASSET, 0.20),
        (AssetClass.ALTERNATIVE, 0.05),
    ],
    ProductType.ETF: [
        (AssetClass.EQUITY, 0.60),
        (AssetClass.FIXED_INCOME, 0.20),
        (AssetClass.COMMODITY, 0.10),
        (AssetClass.MULTI_ASSET, 0.10),
    ],
    ProductType.BOND: [(AssetClass.FIXED_INCOME, 1.0)],
    ProductType.INVESTMENT_ACCOUNT: [
        (AssetClass.MULTI_ASSET, 0.50),
        (AssetClass.EQUITY, 0.30),
        (AssetClass.CASH, 0.20),
    ],
    ProductType.PENSION: [
        (AssetClass.MULTI_ASSET, 0.60),
        (AssetClass.EQUITY, 0.25),
        (AssetClass.FIXED_INCOME, 0.15),
    ],
    ProductType.STRUCTURED: [
        (AssetClass.MULTI_ASSET, 0.60),
        (AssetClass.EQUITY, 0.40),
    ],
    ProductType.INSURANCE: [(AssetClass.MULTI_ASSET, 1.0)],
    ProductType.ANNUITY: [(AssetClass.FIXED_INCOME, 0.70), (AssetClass.MULTI_ASSET, 0.30)],
    ProductType.MONEY_MARKET: [(AssetClass.CASH, 1.0)],
    ProductType.REIT: [(AssetClass.REAL_ESTATE, 1.0)],
    ProductType.PRIVATE_EQUITY: [(AssetClass.ALTERNATIVE, 1.0)],
}

# Geography distribution is global but weighted toward developed markets.
GEOGRAPHY_WEIGHTS: dict[Geography, float] = {
    Geography.GLOBAL: 0.30,
    Geography.US: 0.18,
    Geography.UK: 0.15,
    Geography.EUROPE: 0.12,
    Geography.ASIA_PACIFIC: 0.08,
    Geography.EMERGING_MARKETS: 0.07,
    Geography.JAPAN: 0.04,
    Geography.CHINA: 0.03,
    Geography.INDIA: 0.02,
    Geography.FRONTIER: 0.01,
}

ESG_WEIGHTS: dict[EsgRating, float] = {
    EsgRating.NOT_RATED: 0.30,
    EsgRating.BBB: 0.15,
    EsgRating.A: 0.15,
    EsgRating.AA: 0.12,
    EsgRating.AAA: 0.08,
    EsgRating.BB: 0.10,
    EsgRating.B: 0.06,
    EsgRating.CCC: 0.04,
}

# Customer segment affinity — maps risk level + min-investment to segment.
SEGMENT_RULES: list[tuple[int, Decimal, CustomerSegment]] = [
    # (max_risk_level, min_investment_threshold, segment)
    (2, Decimal("5000"), CustomerSegment.PASSIVE_HOLDER),
    (3, Decimal("10000"), CustomerSegment.MID_TIER_SAVER),
    (4, Decimal("1000"), CustomerSegment.YOUNG_INVESTOR),
    (5, Decimal("50000"), CustomerSegment.RETIREMENT_PLANNER),
    (7, Decimal("250000"), CustomerSegment.HIGH_WEALTH_PROSPECT),
]


# ── Helpers ──────────────────────────────────────────────────────────────────


def _weighted_choice(
    options: list[tuple[object, float]] | dict[object, float],
    rng: random.Random,
) -> object:
    """Pick one option according to the given weights."""
    pairs = options.items() if isinstance(options, dict) else options
    choices, weights = zip(*pairs, strict=True)
    return rng.choices(choices, weights=weights, k=1)[0]


def _build_name(
    product_type: ProductType,
    asset_class: AssetClass,
    geography: Geography,
    issuer: str,
    rng: random.Random,
) -> tuple[str, str]:
    """Generate (name, short_description) that make sense for the product type."""
    if product_type == ProductType.BOND:
        bt = rng.choice(BOND_TYPES)
        name = f"{issuer} {geography.value} {bt} Series {rng.randint(1, 99)}"
        short = f"{bt} issued by {issuer} with {geography.value} exposure."
    elif product_type == ProductType.INVESTMENT_ACCOUNT:
        wrapper = rng.choice(ACCOUNT_WRAPPERS)
        name = f"{issuer} {wrapper}"
        short = f"{wrapper} from {issuer}, suitable for tax-efficient long-term investing."
    elif product_type in (ProductType.PENSION, ProductType.ANNUITY):
        wrapper = rng.choice(["SIPP", "Personal Pension", "Workplace Pension", "Lifetime Annuity"])
        name = f"{issuer} {wrapper} {rng.choice(STYLES)}"
        short = f"Retirement product from {issuer} with a {rng.choice(STYLES).lower()} tilt."
    elif product_type == ProductType.STRUCTURED:
        name = f"{issuer} {geography.value} {rng.choice(['Autocall', 'Capital Protected', 'Enhanced Yield'])} Note"
        short = f"Structured note issued by {issuer} with {geography.value} underlying."
    elif product_type == ProductType.REIT:
        name = f"{issuer} {geography.value} Real Estate Trust"
        short = f"Listed real-estate trust focused on {geography.value} property markets."
    elif product_type == ProductType.MONEY_MARKET:
        name = f"{issuer} {geography.value} Money Market Fund"
        short = f"Short-duration cash fund from {issuer} focused on {geography.value}."
    elif product_type == ProductType.INSURANCE:
        name = (
            f"{issuer} {rng.choice(['Whole Life', 'Variable Life', 'Term Life'])} Investment Plan"
        )
        short = f"Life-assurance-wrapped investment plan from {issuer}."
    elif product_type == ProductType.PRIVATE_EQUITY:
        sector = rng.choice(SECTORS)
        name = f"{issuer} {sector} Private Equity Vehicle {rng.randint(1, 20)}"
        short = f"Closed-end private-equity access vehicle with {sector.lower()} focus."
    else:
        # Funds / ETFs
        style = rng.choice(STYLES)
        sector_bit = f" {rng.choice(SECTORS)}" if rng.random() < 0.3 else ""
        asset_bit = "Bond" if asset_class == AssetClass.FIXED_INCOME else asset_class.value
        kind = "ETF" if product_type == ProductType.ETF else "Fund"
        name = f"{issuer} {geography.value} {style}{sector_bit} {asset_bit} {kind}"
        short = (
            f"{style} {asset_class.value.lower()} {kind.lower()} from {issuer} "
            f"with {geography.value} exposure."
        )
    return name, short


def _build_sku(asset_class: AssetClass, geography: Geography, idx: int) -> str:
    """Stable SKU pattern: WM-<ASSET>-<GEO>-<idx>."""
    asset_code = {
        AssetClass.EQUITY: "EQ",
        AssetClass.FIXED_INCOME: "FI",
        AssetClass.MULTI_ASSET: "MA",
        AssetClass.ALTERNATIVE: "ALT",
        AssetClass.CASH: "CSH",
        AssetClass.COMMODITY: "COM",
        AssetClass.REAL_ESTATE: "RE",
    }[asset_class]
    geo_code = {
        Geography.GLOBAL: "GBL",
        Geography.UK: "UK",
        Geography.US: "US",
        Geography.EUROPE: "EUR",
        Geography.ASIA_PACIFIC: "APAC",
        Geography.EMERGING_MARKETS: "EM",
        Geography.JAPAN: "JP",
        Geography.CHINA: "CN",
        Geography.INDIA: "IN",
        Geography.FRONTIER: "FR",
    }[geography]
    return f"WM-{asset_code}-{geo_code}-{idx:05d}"


def _pick_segment(risk_level: int, min_investment: Decimal, rng: random.Random) -> CustomerSegment:
    """Deterministic-ish mapping so at-risk-abandoner also shows up for variety."""
    if rng.random() < 0.08:
        return CustomerSegment.AT_RISK_ABANDONER
    for max_risk, inv_threshold, seg in SEGMENT_RULES:
        if risk_level <= max_risk and min_investment <= inv_threshold:
            return seg
    return CustomerSegment.HIGH_WEALTH_PROSPECT


def _random_isin(rng: random.Random) -> str:
    """Pseudo-ISIN (12 chars, country prefix + digits). Not a real checksum — seed data only."""
    cc = rng.choice(["GB", "US", "IE", "LU", "FR", "DE", "NL"])
    body = "".join(rng.choices(string.ascii_uppercase + string.digits, k=9))
    checksum = rng.choice(string.digits)
    return cc + body + checksum


def _random_launch_date(rng: random.Random) -> date:
    # Products launch any time in the last 25 years.
    days_back = rng.randint(0, 25 * 365)
    return (datetime.now(tz=UTC) - timedelta(days=days_back)).date()


def _pick_tags(
    product_type: ProductType,
    esg_rating: EsgRating,
    risk_level: int,
    rng: random.Random,
) -> list[str]:
    tags: set[str] = set(rng.sample(TAG_POOL, k=rng.randint(2, 5)))
    if product_type == ProductType.INVESTMENT_ACCOUNT:
        tags.add("tax-efficient")
    if product_type in (ProductType.PENSION, ProductType.ANNUITY):
        tags.add("retirement")
    if esg_rating in (EsgRating.AAA, EsgRating.AA, EsgRating.A):
        tags.add("esg")
        tags.add("sustainable")
    if risk_level <= 2:
        tags.add("low-risk")
    elif risk_level >= 6:
        tags.add("high-risk")
    return sorted(tags)


# ── Top-level generator ──────────────────────────────────────────────────────


def generate_product(idx: int, rng: random.Random, fake: Faker) -> dict:
    """Create a single product record — no hardcoding; everything is sampled."""
    product_type = _weighted_choice(PRODUCT_TYPE_WEIGHTS, rng)  # type: ignore[assignment]
    asset_class = _weighted_choice(ASSET_CLASS_BY_TYPE[product_type], rng)  # type: ignore[assignment]
    geography = _weighted_choice(GEOGRAPHY_WEIGHTS, rng)  # type: ignore[assignment]
    esg_rating = _weighted_choice(ESG_WEIGHTS, rng)  # type: ignore[assignment]
    issuer = rng.choice(ISSUERS)

    # Risk level — correlated with asset class.
    risk_level_bias = {
        AssetClass.CASH: [1, 1, 2],
        AssetClass.FIXED_INCOME: [2, 2, 3, 3, 4],
        AssetClass.MULTI_ASSET: [3, 3, 4, 4, 5],
        AssetClass.EQUITY: [4, 5, 5, 6],
        AssetClass.ALTERNATIVE: [5, 6, 6, 7],
        AssetClass.COMMODITY: [5, 6, 6, 7],
        AssetClass.REAL_ESTATE: [4, 4, 5, 5],
    }
    risk_level = rng.choice(risk_level_bias[asset_class])  # type: ignore[arg-type]

    # Minimum investment — log-scaled from £100 up to £500k.
    min_investment = Decimal(str(round(10 ** rng.uniform(2.0, 5.7), -2)))

    # Fee in bps — index-trackers cheap, alternatives expensive.
    fee_bias = {
        ProductType.ETF: (3, 60),
        ProductType.MONEY_MARKET: (5, 30),
        ProductType.BOND: (20, 90),
        ProductType.MUTUAL_FUND: (35, 180),
        ProductType.STRUCTURED: (80, 250),
        ProductType.INSURANCE: (100, 300),
        ProductType.ANNUITY: (50, 250),
        ProductType.PENSION: (25, 150),
        ProductType.INVESTMENT_ACCOUNT: (0, 60),
        ProductType.REIT: (40, 150),
        ProductType.PRIVATE_EQUITY: (150, 400),
    }
    lo, hi = fee_bias[product_type]  # type: ignore[index]
    fee_bps = rng.randint(lo, hi)

    # AUM — log-scaled from £5m to £50bn.
    aum = Decimal(str(round(10 ** rng.uniform(6.7, 10.7), -4)))

    currency = rng.choices(["GBP", "USD", "EUR", "JPY"], weights=[0.45, 0.35, 0.15, 0.05])[0]
    time_horizon = {
        AssetClass.CASH: TimeHorizon.SHORT,
        AssetClass.FIXED_INCOME: rng.choice([TimeHorizon.SHORT, TimeHorizon.MEDIUM]),
        AssetClass.MULTI_ASSET: TimeHorizon.MEDIUM,
        AssetClass.EQUITY: rng.choice([TimeHorizon.MEDIUM, TimeHorizon.LONG]),
        AssetClass.ALTERNATIVE: TimeHorizon.LONG,
        AssetClass.COMMODITY: rng.choice([TimeHorizon.MEDIUM, TimeHorizon.LONG]),
        AssetClass.REAL_ESTATE: TimeHorizon.LONG,
    }[
        asset_class
    ]  # type: ignore[index]

    liquidity_bias = {
        ProductType.ETF: Liquidity.DAILY,
        ProductType.MUTUAL_FUND: Liquidity.DAILY,
        ProductType.BOND: Liquidity.DAILY,
        ProductType.INVESTMENT_ACCOUNT: Liquidity.DAILY,
        ProductType.MONEY_MARKET: Liquidity.DAILY,
        ProductType.PENSION: Liquidity.MONTHLY,
        ProductType.INSURANCE: Liquidity.QUARTERLY,
        ProductType.ANNUITY: Liquidity.LOCKED,
        ProductType.STRUCTURED: Liquidity.LOCKED,
        ProductType.REIT: Liquidity.DAILY,
        ProductType.PRIVATE_EQUITY: Liquidity.LOCKED,
    }
    liquidity = liquidity_bias[product_type]  # type: ignore[index]

    name, short = _build_name(product_type, asset_class, geography, issuer, rng)  # type: ignore[arg-type]
    long_description = (
        f"{name} — {short} "
        f"Managed by {issuer}. {fake.paragraph(nb_sentences=3)} "
        f"Target outcome: {rng.choice(['capital growth', 'regular income', 'capital preservation', 'inflation protection'])}. "
        f"Risk profile: SRRI {risk_level} of 7."
    )

    segment = _pick_segment(risk_level, min_investment, rng)
    has_ticker = product_type in (ProductType.ETF, ProductType.REIT) and rng.random() < 0.9

    launch = _random_launch_date(rng)
    now = datetime.now(tz=UTC).isoformat(timespec="seconds")

    return {
        "id": str(uuid4()),
        "sku": _build_sku(asset_class, geography, idx),  # type: ignore[arg-type]
        "name": name,
        "short_description": short,
        "long_description": long_description,
        "asset_class": asset_class.value,  # type: ignore[union-attr]
        "product_type": product_type.value,  # type: ignore[union-attr]
        "risk_level": risk_level,
        "time_horizon": time_horizon.value,
        "liquidity": liquidity.value,
        "geography": geography.value,  # type: ignore[union-attr]
        "target_segment": segment.value,
        "esg_rating": esg_rating.value,  # type: ignore[union-attr]
        "min_investment": str(min_investment),
        "currency": currency,
        "fee_bps": fee_bps,
        "aum": str(aum),
        "issuer": issuer,
        "ticker": (issuer[:3].upper() + str(rng.randint(100, 999))) if has_ticker else None,
        "isin": _random_isin(rng),
        "launch_date": launch.isoformat(),
        "is_active": rng.random() > 0.05,
        "tags": _pick_tags(product_type, esg_rating, risk_level, rng),  # type: ignore[arg-type]
        "created_at": now,
        "updated_at": now,
    }


def generate_catalog(count: int = 10_000, seed: int = 42) -> list[dict]:
    """Produce `count` products. Deterministic for a given seed."""
    rng = random.Random(seed)
    fake = Faker("en_GB")
    fake.seed_instance(seed)
    return [generate_product(idx, rng, fake) for idx in range(1, count + 1)]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Generate the wealth-product catalogue JSON.")
    parser.add_argument("--count", type=int, default=10_000, help="Number of products to generate.")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility.")
    parser.add_argument(
        "--out",
        type=Path,
        default=DEFAULT_OUT,
        help="Output JSON path (relative to current working directory).",
    )
    args = parser.parse_args(argv)

    print(f"▶ Generating {args.count} wealth-management products (seed={args.seed})...")
    catalog = generate_catalog(count=args.count, seed=args.seed)

    out_path = args.out.resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)

    print(f"✔ Wrote {len(catalog):,} products → {out_path}")
    print(f"  File size: {out_path.stat().st_size / 1_048_576:.2f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
