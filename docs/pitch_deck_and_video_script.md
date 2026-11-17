# 🏆 Pitch Deck & 3-Minute Video Script Guide
## Track: Engine of Prosperity (Agents for Impact 2026)

---

## 📽️ 3-Minute Video Walkthrough Script (Screen Recording)

**Goal**: Seamlessly hit all 4 judging rubric categories in 180 seconds.

### Timing Breakdown
- **0:00 – 0:30 (Problem & The Paradigm Shift)**: "Flip the Script"
- **0:30 – 1:00 (The Technology & Multi-Hop Traversal)**: BigQuery GQL `{1,3}` + LEHD Job Allocation
- **1:00 – 1:45 (Live Demo: Decision Cockpit & AI Reasoning)**: Claude-style thinking modal + Live Queue
- **1:45 – 2:30 (The Committee Pitch Dossier & Proof Graphs)**: Empirical Chart.js graphs + Counterfactual Runner-up Defense
- **2:30 – 3:00 (Rigor, Equity & Closing Call to Action)**: SBA charge-off ground truth + HUD QCT targeting

---

### Step-by-Step Narration Script

#### ⏱️ 0:00 – 0:30: The Paradigm Shift
> *"When a city economic development office has \$50,000 to allocate among 40 applicants, the default reaction is to save the most desperate business. But ranking by naive distress leads to a trap: it funnels capital into terminal leaf storefronts that hold up nobody else.*
>
> *We flipped the script. We built **Engine of Prosperity**, an autonomous agent designed for an Economic Development Director. Instead of subsidizing isolated distress, it discovers **economic engines**—businesses whose procurement spend cascades backward into dozens of local suppliers, maximizing localized employment retained per grant dollar."*

#### ⏱️ 0:30 – 1:00: Technology & Data Modeling
*(Switch screen to BigQuery / Architecture)*
> *"Under the hood, we solve the challenge's hardest puzzle: per-business employment is unpublished. We modeled direct baseline jobs by geographically allocating Census LEHD employer block counts to nearest registered businesses.*
>
> *Then, using BigQuery Property Graph, our agent executes a genuine 3-hop reverse traversal: `MATCH (engine:Business)<-[:Supplies]-{1,3}(supplier:Business)`. It traces backward from buyer to upstream vendors, calculating true indirect job footprints."*

#### ⏱️ 1:00 – 1:45: Live UI & Claude/Gemini-Style Reasoning
*(Switch screen to Cloud Run Web UI: Live Grant Queue)*
> *"Here is the Live Grant Decision Cockpit running on Google Cloud Run with Vertex AI's Gemini 3.8 Flash. In our queue, applicants are evaluated across a 4-Pillar Scorecard: ROI Multiplier, Tract Equity, Corridor Resilience, and SBA Solvency.*
>
> *Watch what happens when we click **'Pitch Case to Committee'** on The Warfield Theater. Our agent initiates a 5-stage animated reasoning pipeline: traversing the supply graph, synthesizing LEHD job allocations, conducting a Census tract poverty audit, and cross-referencing SBA charge-off records."*

#### ⏱️ 1:45 – 2:30: The Municipal Pitch Dossier & Visual Proof
*(Switch screen to Full-Page Committee Pitch Report)*
> *"In seconds, the agent produces an official SF OEWD Committee Pitch Dossier. It's not raw markdown—it's a formal municipal defense with 4 empirical proof graphs on top.*
>
> *Look at Chart 1: The Warfield doesn't just sustain 84 direct workers—it stimulates 1,335 indirect jobs across 15 corridor suppliers. That's a 16.9x multiplier, slashing the City's cost per job to \$35.24 compared to the municipal benchmark of \$2,500.*
>
> *Crucially, Section 5 answers the judging rubric's hardest question: **Why this business and not the runner-up?** We show a head-to-head counterfactual against Grove Street Books. While Grove Street had higher acute distress, it is a terminal leaf node saving only 3 jobs at \$16,000 per job. Funding The Warfield protects 1,419 community jobs. And our Hub Exclusion Rule ensures we down-rank hubs if their suppliers have active SBA charge-offs or leak capital out of the city."*

#### ⏱️ 2:30 – 3:00: Rigor, Equity & Closing
*(Scroll to Section 4 & 6)*
> *"Every dollar is audited for equity: 26.8% of supplier payroll flows into HUD Qualified Census Tracts. The agent provides the exact formal roll-call motion text for the municipal committee vote.*
>
> *Engine of Prosperity gives cities an unassailable, mathematical framework to turn scarce micro-grants into catalysts for localized economic recovery. Thank you."*

---

## 📑 5-Slide Pitch Deck Structure

### Slide 1: The Hook — Why Traditional Relief Fails
- **Headline**: Small Business Relief is Broken: Don't Save Leaves, Accelerate Engines.
- **Problem**: Scarce capital (\$50k) awarded by naive distress rankings funds terminal storefronts with zero ripple effect.
- **Paradigm Shift**: Shift from "Rescue Mode" to "Prosperity Engines"—funding businesses with dense supplier cascades.

### Slide 2: The Solution — Engine of Prosperity Cockpit
- **Headline**: Autonomous Economic Resilience & Grant Optimization.
- **Target User**: City Economic Development Director (SF OEWD).
- **Core Value**: 4-Pillar Multiplier Scorecard (ROI, Equity, Resilience, Risk).
- **Visual**: Screenshot of Live Queue + Claude/Gemini-style animated thinking progress UI.

### Slide 3: The Architecture — BigQuery Property Graph & Vertex AI
- **Headline**: Deep Multi-Hop Traversal with GQL & Real Credit Signals.
- **GQL Traversal**: `(engine:Business)<-[:Supplies]-{1,3}(supplier:Business)` across Central Market corridor.
- **Job Creation Breakthrough**: Census LEHD geographic allocation to solve unpublished small business employment.
- **Ground Truth Grounding**: Upstream supplier check against SBA 7(a) charge-off records in `a4i_econ.borrowed_from`.

### Slide 4: Empirical Proof — The Municipal Pitch Dossier
- **Headline**: Defending Every Dollar to City Council with Visual Proof.
- **Visuals**:
  - Donut Chart: Direct vs. 1,300+ Indirect Supplier Jobs.
  - Cost Benchmark: \$35.24/job vs \$2,500 City Benchmark.
  - Head-to-Head Counterfactual: Engine vs. Leaf Storefront Runner-up.
- **Hub Exclusion Rule**: Why high-degree hubs with defaulted suppliers are disqualified.

### Slide 5: Real-World Impact & Deliverables
- **Headline**: Production-Ready, Cloud-Native, Publicly Verifiable.
- **Metrics**: 16.9x Job Multiplier, 26.8% Supply Spend in High-Poverty QCT Tracts.
- **Live Infrastructure**:
  - Web UI: `https://my-agent-ie5pmvccxq-uc.a.run.app/`
  - Reasoning Engine: `projects/982712366919/.../reasoningEngines/2762033682112839680`
  - Gemini 3.8 Flash + Google ADK + BigQuery Property Graph.
