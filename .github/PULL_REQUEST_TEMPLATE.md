## Summary

<!-- Describe what this PR does and why in 1-3 sentences -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Model update — new or re-trained ML model
- [ ] Middleware API change (admin_api / customer_api / data_management_api)
- [ ] Portal change (admin_portal / customer_portal)
- [ ] Airflow DAG change
- [ ] Refactor / cleanup
- [ ] Documentation
- [ ] CI / tooling / infrastructure

## Related issues

Closes #

## Affected components

<!-- Tick all that apply -->

- [ ] `middleware/admin_api`
- [ ] `middleware/customer_api`
- [ ] `middleware/data_management_api`
- [ ] `portals/admin_portal`
- [ ] `portals/customer_portal`
- [ ] `airflow/dags`
- [ ] `engine/wealthsignal`
- [ ] `docs` / `tests` / `ci`

## Test plan

- [ ] Unit tests added or updated
- [ ] Integration tests pass locally
- [ ] FastAPI endpoint tested via `httpx.AsyncClient` (if middleware change)
- [ ] Airflow DAG parses without errors (`airflow dags list-import-errors`)
- [ ] MLflow run logged with experiment name + run ID (if model change)
- [ ] Manual end-to-end test completed

## ML model changes (if applicable)

- **Experiment:**
- **MLflow run URL:**
- **Dataset version (DVC):**
- **Baseline metric:**
- **New metric:**
- **Promoted to Model Registry stage:** [ ] Staging [ ] Production

## Compliance checklist

- [ ] No PII or customer data committed
- [ ] No hardcoded secrets or credentials
- [ ] FCA-sensitive changes reviewed by a compliance stakeholder
- [ ] Model card updated if model behaviour changed
- [ ] OpenAPI spec regenerated (if middleware schema changed)

## Screenshots / MLflow links

<!-- Paste MLflow run URLs, metric screenshots, confusion matrices, or portal screenshots here -->
