# Economic Resilience & Micro-Grant Allocation Front End

**Agents for Impact 2026 — Challenge 3: Community Economic Resilience & Micro-Grants**

A React web application built for municipal grant officers (e.g. City and County of San Francisco Office of Economic & Workforce Development) to allocate relief funds based on **multi-hop supply chain cascade protection** rather than naive distress ranking.

---

## Key Features

1. **Grant Allocation Queue & Strategy Optimizer:**
   - Real-time comparison between **Naive Distress Ranking** (Section 2 anti-pattern that funds isolated leaf nodes like dry cleaners and bookstores) versus **Graph Cascade Resilience Allocation** (which secures keystone suppliers, bakeries, and wholesale hubs).
   - Dynamic budget pool controller ($10,000 – $150,000).
   - Live metrics: Budget Remaining, Direct Jobs Preserved, Cascading Downstream Jobs Shielded, and Systemic Multiplier ratio.

2. **Interactive Cascade Network Graph Visualizer:**
   - Multi-modal relationship rendering:
     - `Supplies` (blue directed edges with BEA intensity coefficients)
     - `DrawsFootfall` (pink dashed edges from Census LEHD employer blocks)
     - `BorrowedFrom` (amber edges for SBA PPP / 7(a) loan histories)
   - Traversal depth filter (1-hop, 2-hop, 3-hop).
   - **Interactive Failure Simulation**: Simulates the closure of any seed business, showing downstream buyer ripple effects in real time.
   - Grounded in BigQuery GQL syntax (`GRAPH a4i_econ.LocalEconomy MATCH p = ...`).

3. **Google Map & Geospatial Corridor View:**
   - Physical geographic map of the commercial corridor (e.g. Market St / 6th / 7th / 9th St in SF, 24th St Mission, Chinatown Stockton/Grant).
   - Real latitude/longitude placement of all local businesses and Census LEHD employer blocks.
   - Geodetic cascade polylines with directional arrows and intensity weighting.
   - Live Shockwave simulation: when "Simulate Shock" is clicked, concentric ripple rings radiate from the seed establishment, highlighting the immediate geographic exposure path.
   - Supports both native Google Maps JavaScript SDK (via API Key modal or `VITE_GOOGLE_MAPS_API_KEY`) and an interactive zero-key spatial GIS canvas with Night and Satellite modes.

4. **Official Grant Memo Generator (The Required Hackathon Artifact):**
   - Formatted for committee presentation with municipal letterhead.
   - Includes all 7 criteria required by Challenge 3:
     1. Business name, DBA, address, and grant amount
     2. Protected cascade: named businesses, distance in hops, and link intensities
     3. Evidentiary GQL traversal query
     4. Counterfactual comparison: Why this business and *not* the distress-ranked runner-up
     5. Model assumptions and probability delta
     6. Honest limitations disclosure (distinguishing real SF Open Data & Census data from BEA modeled supply rates)
     7. Census tract demographics and equity audit
   - Export to Markdown, Print / PDF export ready.

4. **Economic Shock & Failure Simulator:**
   - Stress-test the commercial corridor by closing any business or combination of businesses.
   - Direct vs. cascading payroll loss calculations.

5. **AI BigQuery Graph Copilot:**
   - Conversational assistant simulating the ADK agent connected to BigQuery Property Graph.
   - Pre-configured queries for Section 13 sweet-spot analysis (5–25 dependents), edge provenance audit, and equity reporting.

6. **Tract Demographics & Equity Audit:**
   - Detailed analysis of Census Tract 124.02 (Tenderloin / Mid-Market), 229.01 (Calle 24), and 118 (Chinatown).
   - HUD Area Median Income (AMI) % and Qualified Census Tract compliance.

---

## Quick Start

### 1. Development Server
```bash
cd front-end
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Production Build
```bash
cd front-end
npm run build
npm run preview
```
