# customer_portal — Customer-facing Wealth Platform

Angular 17 standalone-component application exposed to customers. Lets them sign up for wealth products, browse the catalogue via natural-language or structured search, and complete (or partially complete) application forms that downstream models score.

## Tech stack

- Angular 17 · TypeScript (strict mode)
- Angular Material · SCSS design tokens shared with `admin_portal` via `portals/shared/`
- Signals + feature services for state (lighter-weight than NgRx for the consumer flow)
- Angular Router with typed route params
- Jest (unit) · Playwright (e2e, including form-abandonment scenarios)
- Managed as an npm workspace from the root `package.json`

## Primary flows

### 1. Browse the catalogue

Two entry points that land on the same product list:

- **NLP search** — a single search box at the top of the landing page. Typing submits a `POST /api/v1/products/search/nlp` request and renders the top-20 hits ordered by similarity score, with matched-term chips on each card.
- **Criteria search** — a "Refine" side panel with dropdowns for asset class, product type, risk level (SRRI 1-7 slider), geography, target customer segment, ESG rating, and max minimum-investment. Each change re-issues `POST /api/v1/products/search/criteria`.

A customer can start with NLP search and then narrow with criteria, or vice versa.

### 2. Sign up for a wealth product

Clicking **Sign up** on a product detail card opens a multi-step wealth-product application:

| Step | Fields | What happens |
|---|---|---|
| 1 — Identity | Name, DOB, email | Persisted on every keystroke via `POST /api/v1/customers/applications/draft` (customer_api) |
| 2 — Financials | Employment, income band, existing wealth, risk questionnaire | Same draft-persistence pattern |
| 3 — Product-specific | Fields vary per `product_type` (e.g. ISA allowance, pension contribution) | |
| 4 — Review & submit | Summary card | `POST /api/v1/customers/applications/submit` |

**Partial-form behaviour is the backbone of the system.** If a customer abandons at any step, the Decision Engine uses the partial draft to score completion probability + customer segment + next-best-action, and downstream agents (LangGraph / ADK) generate a personalised follow-up offer to the email the customer has already provided. See the top-level [README.md](../../README.md) for the wider architecture.

### 3. Offer landing pages

A separate route handles email links from follow-up offers: `/offers/{token}` opens a pre-filled application with the original draft + the offer narrative.

## Routes

| Screen | Route | API |
|---|---|---|
| Home / NLP search | `/` | `POST /api/v1/products/search/nlp` |
| Criteria search | `/products` | `POST /api/v1/products/search/criteria`, `GET /api/v1/categories` |
| Product detail | `/products/{sku}` | `GET /api/v1/products/sku/{sku}` |
| Application — step N | `/apply/{sku}/step/{n}` | `POST /api/v1/customers/applications/draft` (customer_api) |
| Offer landing | `/offers/{token}` | `GET /api/v1/customers/offers/{token}` (customer_api) |
| Account | `/account` | `GET /api/v1/customers/me` (customer_api) |

## OpenAPI client generation

Same approach as `admin_portal` — clients are generated from the OpenAPI specs of `customer_api` and `product_catalog_api` into `src/app/api/`.

## Local development

```bash
npm run run:local:docker:all          # infrastructure
npm run run:local:middleware:all      # all four FastAPI services
npm run run:local:portals:customer    # customer_portal on :4202
```

## Scaffolding

When the Angular app is scaffolded (`ng new customer-portal --routing --style=scss --standalone`), drop the files into this directory and wire it into the root `package.json` npm-workspace scripts.

## Related

- [`admin_portal`](../admin_portal/README.md) — the internal operations counterpart.
- [`middleware/customer_api`](../../middleware/customer_api/) — owns customer identity, drafts, and submissions.
- [`middleware/product_catalog_api`](../../middleware/product_catalog_api/) — backs the search + product-detail screens.
