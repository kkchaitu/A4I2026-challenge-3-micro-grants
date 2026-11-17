# Challenge 3: Community Economic Resilience & Micro-Grants - Custom Track

## Track Name: Engine of Prosperity

This project implements a custom track for the Agents for Impact 2026 challenge. We are explicitly building the "Custom" track, not the standard Main Street, Micro-producer, or Anchor closure tracks.

### Core Concept
*   **Flip the script:** Instead of saving failing businesses, the goal is to accelerate successful ones.
*   **Economic Engines:** We are looking for "economic engines"—businesses whose expansion creates the largest ripple of localized job growth.
*   **Objective:** Lower the city's unemployment rate by maximizing the total job footprint (direct + indirect) created per grant dollar.

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
