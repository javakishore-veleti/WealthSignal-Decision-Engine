-- Bootstrap logical separation of application schemas inside the shared
-- local Postgres instance. Each middleware service owns its own schema so
-- we can migrate/drop independently during development.
--
-- Airflow is NOT listed here — it gets its own database (see below). A
-- dedicated-schema setup on Airflow 2.9 is fragile: the deprecated
-- AIRFLOW__CORE__SQL_ALCHEMY_SCHEMA path broke `_reserialize_dags`
-- during db migrate with "relation \"airflow.serialized_dag\" does not
-- exist". Giving Airflow its own DB removes the search_path problem.

CREATE SCHEMA IF NOT EXISTS mlflow;
CREATE SCHEMA IF NOT EXISTS product_catalog;
CREATE SCHEMA IF NOT EXISTS customer;
CREATE SCHEMA IF NOT EXISTS admin_ops;
CREATE SCHEMA IF NOT EXISTS data_management;

-- Extensions used across the estate.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;     -- trigram indexes for fuzzy search
CREATE EXTENSION IF NOT EXISTS btree_gin;   -- composite GIN indexes

-- Dedicated database for Airflow metadata. Postgres has no
-- CREATE DATABASE IF NOT EXISTS, and CREATE DATABASE cannot run inside
-- a transaction/DO block, so we use \gexec to conditionally emit it.
SELECT 'CREATE DATABASE airflow OWNER wealthsignal'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'airflow')
\gexec
