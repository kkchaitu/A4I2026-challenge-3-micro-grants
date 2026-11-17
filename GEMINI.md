# Challenge 3: Community Economic Resilience & Micro-Grants - Custom Track

## Track Name: Engine of Prosperity

This project implements a custom track for the Agents for Impact 2026 challenge. We are explicitly building the "Custom" track, not the standard Main Street, Micro-producer, or Anchor closure tracks.

### Core Concept
*   **Flip the script:** Instead of saving failing businesses, the goal is to accelerate successful ones.
*   **Economic Engines:** We are looking for "economic engines"—businesses whose expansion creates the largest ripple of localized job growth.
*   **Objective:** Lower the city's unemployment rate by maximizing the total job footprint (direct + indirect) created per grant dollar.

### Documentation & Planning
*   **[Track Naming & Pitch](docs/track_naming.md):** Options for naming and framing the track for the judges.
*   **[Short Pitches](docs/short_pitch.md):** Elevator pitches combining the concepts of prosperity and growth.
*   **[Track Metrics](docs/track_metrics.md):** The framework for measuring ROI, Equity, Resilience, and Risk.
*   **[Grading Criteria & Scoring Audit](docs/grading_criteria_scoring.md):** Official 110-point competition scorecard, staffing lanes, and defenses.
*   **[Implementation Plan](docs/track_metrics_plan.md):** How the data and agent lanes will collect and calculate the required metrics.
*   **[Track Suggestion](docs/track_suggestion.md):** The original breakdown of the track mechanics.

### GQL Traversal Direction
*   The `Supplies` relationship points from `Supplier -> Buyer`.
*   Because we are helping the buyer (the "engine") expand, the economic benefit flows **backward** against the arrow to their suppliers.
*   The traversal must use the following pattern to find the engine:
    ```sql
    MATCH p = (engine:Business)<-[:Supplies]-{1,3}(supplier:Business)
    ```

### Crucial Differentiator: Modeling Job Creation
*   The challenge explicitly notes that "per-business employment is not published" and that providing a defensible model for job counts is a "real contribution" that separates winning teams.
*   **Our Approach (Option B):** We will model direct business employment by geographically allocating the real job counts from the `employer_blocks` table to the registered `businesses` physically closest to them.
*   **The Math:** By creating a baseline `estimated_jobs` attribute for every business, our graph traversal can calculate a true "Multiplier Effect" sum, proving the downstream employment ROI of the grant.
*   **Honest Limitations:** We will explicitly declare to the judges that this geographic allocation model introduces structural skew (e.g., large office block jobs being assigned to small retailers), fulfilling the challenge requirement to state our assumptions.

### Target User
*   The primary user for this track is an **Economic Development Director** looking to allocate growth grants or tax incentives to drive targeted job creation and economic diversification, rather than an emergency relief officer.

### Live Infrastructure & Deployments
*   **Active Model**: `gemini-3.8-flash` (Vertex AI, `GOOGLE_CLOUD_LOCATION=global`, `GOOGLE_GENAI_USE_ENTERPRISE=true`).
*   **Cloud Run (Public Web UI)**: [https://my-agent-ie5pmvccxq-uc.a.run.app/dev-ui/?app=app](https://my-agent-ie5pmvccxq-uc.a.run.app/dev-ui/?app=app)
*   **Google Cloud Agent Runtime**: `projects/982712366919/locations/us-east1/reasoningEngines/2762033682112839680`
*   **Deployment Script**: `./deploy.sh` (one-command build and deploy to Cloud Run from the CLI).

### BigQuery Property Graph
*   **Dataset**: `a4i_econ`
*   **Property Graph Name**: `a4i_econ.corridor_graph`
*   **DDL Declaration**:
    ```sql
    CREATE OR REPLACE PROPERTY GRAPH a4i_econ.corridor_graph
      NODE TABLES (
        a4i_econ.businesses
          KEY (business_id)
          LABEL Business PROPERTIES (business_id, name, naics, naics4, zip, latitude, longitude, estimated_jobs),
        a4i_econ.employer_blocks
          KEY (block_id)
          LABEL Employer PROPERTIES (block_id, jobs, tract)
      )
      EDGE TABLES (
        a4i_econ.supplies
          KEY (edge_id)
          SOURCE KEY (supplier_id) REFERENCES businesses (business_id)
          DESTINATION KEY (buyer_id) REFERENCES businesses (business_id)
          LABEL Supplies PROPERTIES (intensity, metres),
        a4i_econ.draws_footfall_from
          KEY (edge_id)
          SOURCE KEY (block_id) REFERENCES employer_blocks (block_id)
          DESTINATION KEY (business_id) REFERENCES businesses (business_id)
          LABEL DrawsFootfall PROPERTIES (worker_share, metres)
      );
    ```
