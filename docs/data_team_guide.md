# Data Team Guide: Customizing Track Metrics & Report Calculations

This guide explains how the **"Engine of Prosperity"** evaluation pipeline works and where the data team can plug in refined calculations, weights, and graph queries.

---

## 1. Architecture Overview

```
               BigQuery (a4i_econ)
       [businesses, supplies, borrowed_from, tract_demographics]
                               │
                               ▼
                    Reverse GQL Traversal
     MATCH (engine)<-[:Supplies]-{1,3}(supplier:Business)
                               │
                               ▼
                my-agent/app/metrics_service.py
       ┌─────────────────────────────────────────────────┐
       │ Pillar 1: ROI & Employment Multiplier           │
       │ Pillar 2: Equity & Need (Census Poverty)        │
       │ Pillar 3: Resilience (NAICS Concentration)      │
       │ Pillar 4: Risk & Context (SBA Charge-offs)      │
       │ Composite Score & Recommendation Tier (0 - 100) │
       └─────────────────────────────────────────────────┘
                               │
                 ┌─────────────┴─────────────┐
                 ▼                           ▼
     my-agent/app/requests_store.py      my-agent/app/agent.py
      - Application queue & memos         - ADK Agent Decision Tools
                 │                           │
                 └─────────────┬─────────────┘
                               ▼
                my-agent/app/fast_api_app.py
                  GET /dashboard (Web UI)
                  GET /api/requests
                  GET /api/requests/{id}
```

---

## 2. Where to Modify Metric Calculations

All metric formulas reside in:
[`my-agent/app/metrics_service.py`](file:///config/.gemini/antigravity/worktrees/AgentsForImpact/adk_agent_metrics_ui_skeleton/my-agent/app/metrics_service.py)

Search for the marker:
```python
# --- DATA TEAM: MODIFY CALCULATION LOGIC HERE ---
```

### Pillar 1: ROI & Employment Multiplier
- **Baseline Direct Jobs**: Modeled from `a4i_econ.businesses.estimated_jobs` (allocated geographically from `employer_blocks`).
- **Indirect Jobs**: Computed from the reverse multi-hop GQL traversal:
  ```sql
  SELECT * FROM GRAPH_TABLE(
    a4i_econ.corridor_graph
    MATCH (engine:Business {business_id: @id})<-[s:Supplies]-{1,3}(supplier:Business)
    COLUMNS (...)
  )
  ```
- **Customization options for data team**:
  - Incorporate edge property `s.intensity` (BEA direct requirements coefficient) to scale indirect jobs rather than a raw unweighted sum.
  - Tweak hop depth (1 to 3 hops vs 1 to 2 hops).

### Pillar 2: Equity & Need
- **Neighborhood Poverty Rate**: Queries `a4i_econ.tract_demographics` for the applicant's census tract.
- **Supply Chain Poverty Footprint**: Average or supplier-weighted poverty rate of the census tracts where upstream suppliers reside.
- **Customization options**:
  - Weight supplier tract poverty by supplier size (`estimated_jobs`) or purchase intensity (`metres` / distance decay).

### Pillar 3: Resilience & Diversification
- **Industry Concentration Risk**: Calculates what percentage of total corridor jobs belong to the applicant's NAICS code.
- **Supply Chain Breadth**: Count of distinct supplier businesses impacted.
- **Supplier Industry Variety**: Count of distinct NAICS codes in the applicant's upstream network.
- **Customization options**:
  - Refine NAICS matching level (2-digit sector vs 4-digit vs 6-digit).

### Pillar 4: Risk & Context
- **Cascade Depth**: Max traversal hops.
- **Fragility Flag**: Standard SQL check against `a4i_econ.borrowed_from` for `charged_off = true` among suppliers in the cascade.
- **Customization options**:
  - Check loan maturity dates, gross loan approval size, or bank identity.

### Overall Composite Score & Recommendation Tiers
In `metrics_service.py`:
```python
# --- DATA TEAM: OVERALL RATING & COMPOSITE SCORING WEIGHTS ---
multiplier_score = min(multiplier * 15, 100) * 0.35
cost_score       = max(0, 100 - (cost_per_job / 15)) * 0.25
equity_score     = min(neighborhood_poverty * 3, 100) * 0.20
breadth_score    = min(supply_chain_breadth * 10, 100) * 0.20

overall_score = round(multiplier_score + cost_score + equity_score + breadth_score, 1)
if fragility_flag:
    overall_score = max(0, overall_score - 15)
```
- **Tiers**:
  - `>= 80`: `STRONGLY RECOMMEND` (Emerald)
  - `65 - 79`: `RECOMMEND` (Blue)
  - `50 - 64`: `CONSIDER WITH CONDITIONS` (Amber)
  - `< 50`: `HIGH RISK / REVIEW` (Rose)

---

## 3. How to Modify Incoming Requests

The list of incoming grant applications is managed in:
[`my-agent/app/requests_store.py`](file:///config/.gemini/antigravity/worktrees/AgentsForImpact/adk_agent_metrics_ui_skeleton/my-agent/app/requests_store.py)

To add default applications, edit the `INITIAL_APPLICATIONS` list. You can specify any `business_id` from `a4i_econ.businesses` (e.g. `114`, `141`, `103`, `169`, `170`, `60`, `64`, `54`).

---

## 4. Running Locally & Testing

From repo root:
```bash
cd my-agent
uv run uvicorn app.fast_api_app:app --host 0.0.0.0 --port 8080
```
Open in browser:
- **Grant Officer Dashboard**: `http://localhost:8080/dashboard`
- **API Endpoints**: `http://localhost:8080/api/requests`
- **ADK Agent Playground**: `http://localhost:8080/dev-ui/?app=app`
