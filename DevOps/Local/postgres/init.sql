-- Bootstrap logical separation of application schemas inside the shared
-- local Postgres instance. Each middleware service owns its own schema so
-- we can migrate/drop independently during development.

CREATE SCHEMA IF NOT EXISTS airflow;
CREATE SCHEMA IF NOT EXISTS product_catalog;
CREATE SCHEMA IF NOT EXISTS customer;
CREATE SCHEMA IF NOT EXISTS admin_ops;
CREATE SCHEMA IF NOT EXISTS data_management;

-- Extensions used across the estate.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;     -- trigram indexes for fuzzy search
CREATE EXTENSION IF NOT EXISTS btree_gin;   -- composite GIN indexes
