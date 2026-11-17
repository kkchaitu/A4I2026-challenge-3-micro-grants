# Challenge 3: Community Economic Resilience & Micro-Grants - Custom Track

## Track Name: Engine of Prosperity

This project implements a custom track for the Agents for Impact 2026 challenge. We are explicitly building the "Custom" track, not the standard Main Street, Micro-producer, or Anchor closure tracks.

### Core Concept
*   **Flip the script:** Instead of saving failing businesses, the goal is to accelerate successful ones.
*   **Economic Engines:** We are looking for "economic engines"—businesses whose expansion creates the largest ripple of growth and stability for their suppliers.
*   **Objective:** Maximize downstream businesses supported and stabilized per grant dollar.

### GQL Traversal Direction
*   The `Supplies` relationship points from `Supplier -> Buyer`.
*   Because we are helping the buyer (the "engine") expand, the economic benefit flows **backward** against the arrow to their suppliers.
*   The traversal must use the following pattern to find the engine:
    ```sql
    MATCH p = (engine:Business)<-[:Supplies]-{1,3}(supplier:Business)
    ```

### Crucial Constraint: The "Job Count" Trap
*   **DO NOT** attempt to maximize or calculate "indirect jobs" using the public data provided by the challenge.
*   Per-business employment is **not published** for small businesses anywhere in the US data provided. The Census publishes counts by area and industry, never by business.
*   **Instead:** The cascade should count the number of *businesses* exposed/supported, not jobs.
*   *Exception:* If you integrate a custom external data source (e.g., average employee count by NAICS code) or use Gemini to estimate headcount heuristically based on industry and location, clearly state this assumption. This is a high-reward differentiator if done correctly and honestly.

### Target User
*   The primary user for this track is an **Economic Development Director** looking to allocate growth grants or tax incentives, rather than an emergency relief officer.
