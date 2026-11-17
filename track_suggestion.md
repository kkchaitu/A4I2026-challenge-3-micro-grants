# Track Suggestion: Maximizing Job Creation

This is a fantastic custom track. It flips the scenario from "preventing collapse" to "maximizing growth," while still leveraging the core graph mechanics. 

As the README notes, the biggest hurdle is that **per-business employment data is not public**. To build this, you need to estimate jobs, traverse the graph to find the "multiplier effect," and target high-need areas. 

Here is how your team can tackle this:

### 1. Data Lane: Estimate Direct Jobs (The Missing Data)
You cannot optimize for employment without an employment metric. Since you don't have exact counts, you must model them:
*   **Option A (External Data - Recommended)**: Bring in the **Census County Business Patterns (CBP)** dataset. It provides the average number of employees per establishment by NAICS industry code. You can join this with your `businesses` table on the `naics` column to give every business a baseline job estimate.
*   **Option B (Use Existing Data)**: You already have the `employer_blocks` table, which contains real job counts (`jobs`) per census block. You could geographically join `businesses` to `employer_blocks` and evenly divide a block's jobs among the businesses in that block.

### 2. Graph Traversal: The Multiplier Effect (Indirect Jobs)
If a business receives a grant and expands, it buys more inventory and services. This creates *indirect* jobs at its suppliers. You will use BigQuery Property Graphs to measure this.
*   **Direction matters**: The `Supplies` edge goes from `Supplier -> Buyer`. If your applicant (the Buyer) expands, the economic benefit flows *backward* to the Supplier. 
*   Your GQL traversal must run **against the arrow**: `MATCH p = (applicant:Business)<-[s:Supplies]-{1,3}(supplier:Business)`
*   **The Math**: The total employment impact of a grant is:
    `Total Jobs Created = (Applicant Direct Jobs) + SUM(Supplier Direct Jobs * Supply Intensity)`

### 3. Equity Audit: Targeting Need
To lower the city's unemployment rate, the jobs created must be accessible to the unemployed. Small businesses disproportionately hire locally.
*   Use the `tract_demographics` table (which contains poverty and demographic metrics).
*   Your agent should prioritize applicants whose business—and whose downstream suppliers—are located in census tracts with high poverty/unemployment indicators.

### 4. Architecture & Agent Tools
*   **Graph Creation**: Write a `CREATE PROPERTY GRAPH` statement that includes your new modeled `jobs` attribute on the `Business` nodes.
*   **Agent Tool**: Build a custom Python tool (via MCP or ADK) that takes an `applicant_id`. The tool runs the GQL traversal backwards, calculates the Total Jobs Created formula, and fetches the `tract_demographics` for those businesses.
*   **The System Prompt**: Instruct the agent that its goal is to act as an Economic Development Officer. When given a queue of applicants, it should use the tool to find the applicant with the highest "Job Footprint" in the highest-need tracts, and output a Grant Memo justifying the ROI.
