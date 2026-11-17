-- ============================================================================
-- PROPERTY GRAPH VALIDATION SUITE: a4i_econ.corridor_graph
-- Agents for Impact 2026 — Track: Engine of Prosperity
-- ============================================================================
-- PURPOSE:
-- BigQuery Property Graph DDL does NOT enforce primary key or foreign key
-- constraints at creation time. Duplicate keys silently multiply traversal
-- paths exponentially rather than raising errors, corrupting centrality and
-- multiplier calculations.
--
-- This script validates data hygiene and integrity across all node and edge tables.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. NODE TABLE: a4i_econ.businesses (Key: business_id)
-- ----------------------------------------------------------------------------
-- Assert zero duplicate business IDs.
SELECT 
  'businesses' AS table_name,
  business_id, 
  COUNT(*) AS duplicate_count
FROM `a4i_econ.businesses`
GROUP BY business_id
HAVING COUNT(*) > 1;

-- ----------------------------------------------------------------------------
-- 2. NODE TABLE: a4i_econ.employer_blocks (Key: block_id)
-- ----------------------------------------------------------------------------
-- Assert zero duplicate employer block IDs.
SELECT 
  'employer_blocks' AS table_name,
  block_id, 
  COUNT(*) AS duplicate_count
FROM `a4i_econ.employer_blocks`
GROUP BY block_id
HAVING COUNT(*) > 1;

-- ----------------------------------------------------------------------------
-- 3. EDGE TABLE: a4i_econ.supplies (Key: edge_id)
-- ----------------------------------------------------------------------------
-- Assert zero duplicate edge IDs.
SELECT 
  'supplies_edge_keys' AS table_name,
  edge_id, 
  COUNT(*) AS duplicate_count
FROM `a4i_econ.supplies`
GROUP BY edge_id
HAVING COUNT(*) > 1;

-- ----------------------------------------------------------------------------
-- 4. EDGE TABLE: a4i_econ.draws_footfall_from (Key: edge_id)
-- ----------------------------------------------------------------------------
-- Assert zero duplicate footfall edge IDs.
SELECT 
  'draws_footfall_edge_keys' AS table_name,
  edge_id, 
  COUNT(*) AS duplicate_count
FROM `a4i_econ.draws_footfall_from`
GROUP BY edge_id
HAVING COUNT(*) > 1;

-- ----------------------------------------------------------------------------
-- 5. REFERENTIAL INTEGRITY: Dangling Edges in a4i_econ.supplies
-- ----------------------------------------------------------------------------
-- Assert that all supplier_id and buyer_id values exist in a4i_econ.businesses.
SELECT 
  'supplies_dangling_edges' AS check_name,
  s.edge_id,
  s.supplier_id,
  s.buyer_id,
  CASE 
    WHEN b_sup.business_id IS NULL THEN 'Missing Supplier'
    WHEN b_buy.business_id IS NULL THEN 'Missing Buyer'
    ELSE 'Valid'
  END AS issue
FROM `a4i_econ.supplies` s
LEFT JOIN `a4i_econ.businesses` b_sup ON s.supplier_id = b_sup.business_id
LEFT JOIN `a4i_econ.businesses` b_buy ON s.buyer_id = b_buy.business_id
WHERE b_sup.business_id IS NULL OR b_buy.business_id IS NULL;

-- ----------------------------------------------------------------------------
-- 6. TOPOLOGY INTEGRITY: Self-Loops in Supply Chain
-- ----------------------------------------------------------------------------
-- Detect whether any firm is listed as supplying itself.
SELECT 
  'supplies_self_loops' AS check_name,
  edge_id,
  supplier_id,
  buyer_id
FROM `a4i_econ.supplies`
WHERE supplier_id = buyer_id;

-- ----------------------------------------------------------------------------
-- 7. ATTRIBUTE VALIDITY: Weights and Physical Metrics
-- ----------------------------------------------------------------------------
-- Check for negative distances, zero or negative jobs, or unphysical intensities.
SELECT 
  'attribute_sanity' AS check_name,
  COUNTIF(metres < 0) AS negative_distances,
  COUNTIF(intensity <= 0) AS invalid_intensities
FROM `a4i_econ.supplies`;

SELECT 
  'jobs_sanity' AS check_name,
  COUNTIF(estimated_jobs < 0) AS negative_estimated_jobs,
  COUNTIF(estimated_jobs IS NULL) AS null_estimated_jobs
FROM `a4i_econ.businesses`;

-- ----------------------------------------------------------------------------
-- 8. GQL TRAVERSAL VERIFICATION (Engine of Prosperity Multi-Hop)
-- ----------------------------------------------------------------------------
-- Verify that the reverse GQL path expression executes cleanly and returns
-- non-empty upstream supplier trees.
SELECT * FROM GRAPH_TABLE(a4i_econ.corridor_graph
  MATCH (engine:Business)<-[s:Supplies]-{1,3}(supplier:Business)
  WHERE engine.business_id = '114'
  COLUMNS (
    engine.name AS engine_name,
    supplier.name AS supplier_name,
    supplier.business_id AS supplier_id,
    supplier.estimated_jobs AS supplier_jobs
  )
)
LIMIT 10;
