# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import json
import unittest
from fastapi.testclient import TestClient

from app.metrics_service import calculate_applicant_metrics, _generate_simulated_metrics
from app.requests_store import store
from app.fast_api_app import app


class TestMetricsAndDashboard(unittest.TestCase):
    """Verifies metrics calculation, requests store, and FastAPI routes."""

    def test_metrics_calculation_structure(self):
        """Verifies that metrics return the required 4-pillar structure and recommendation."""
        metrics = calculate_applicant_metrics(business_id="114", grant_amount=50000, purpose="Acoustics upgrade")

        self.assertIn("roi", metrics)
        self.assertIn("equity", metrics)
        self.assertIn("resilience", metrics)
        self.assertIn("risk", metrics)
        self.assertIn("overall_score", metrics)
        self.assertIn("rating", metrics)
        self.assertIn("rating_color", metrics)

        # Pillar 1: ROI
        roi = metrics["roi"]
        self.assertIn("direct_jobs", roi)
        self.assertIn("indirect_jobs", roi)
        self.assertIn("total_job_footprint", roi)
        self.assertIn("cost_per_job", roi)
        self.assertIn("job_multiplier", roi)
        self.assertGreaterEqual(roi["total_job_footprint"], roi["direct_jobs"])

        # Pillar 2: Equity
        equity = metrics["equity"]
        self.assertIn("neighborhood_poverty_rate", equity)
        self.assertIn("supply_chain_poverty_footprint", equity)

        # Pillar 3: Resilience
        resilience = metrics["resilience"]
        self.assertIn("industry_concentration_risk", resilience)
        self.assertIn("supply_chain_breadth", resilience)
        self.assertIn("supplier_industry_variety", resilience)

        # Pillar 4: Risk
        risk = metrics["risk"]
        self.assertIn("cascade_depth_hops", risk)
        self.assertIn("fragility_flag", risk)

    def test_simulated_fallback(self):
        """Verifies fallback generation if offline or business not found."""
        sim = _generate_simulated_metrics(business_id="fake_999", grant_amount=25000, purpose="Testing")
        self.assertEqual(sim["business_id"], "fake_999")
        self.assertGreater(sim["roi"]["total_job_footprint"], 0)
        self.assertIn(sim["rating"], ["STRONGLY RECOMMEND", "RECOMMEND", "CONSIDER WITH CONDITIONS", "HIGH RISK / REVIEW"])

    def test_requests_store_operations(self):
        """Verifies listing, retrieving, and creating applications."""
        reqs = store.list_requests()
        self.assertGreaterEqual(len(reqs), 6)

        # Verify summary structure
        first = reqs[0]
        self.assertIn("request_id", first)
        self.assertIn("business_name", first)
        self.assertIn("direct_jobs", first)
        self.assertIn("indirect_jobs", first)
        self.assertIn("total_job_footprint", first)
        self.assertIn("overall_score", first)
        self.assertIn("rating", first)
        self.assertIn("guardrail_status", first)

        # Retrieve single
        detail = store.get_request(first["request_id"])
        self.assertIsNotNone(detail)
        self.assertIn("report", detail)
        self.assertIn("memo", detail)
        self.assertIn("Executive Grant Memorandum", detail["memo"])
        self.assertIn("guardrail_audit", detail)

        # Create new application
        new_app = store.create_request(
            business_id="171",
            grant_amount=75000,
            purpose="Server infrastructure upgrade",
            business_name="Tradespace Tech"
        )
        self.assertTrue(new_app["request_id"].startswith("REQ-2026-"))
        self.assertEqual(new_app["grant_amount"], 75000)
        self.assertEqual(new_app["business_name"], "Tradespace Tech")
        self.assertIn("guardrail_audit", new_app)

    def test_api_routes(self):
        """Verifies FastAPI endpoints for dashboard and API."""
        client = TestClient(app)

        # 1. Frontend HTML (accessible at / and /app, and standalone dashboard at /dashboard)
        root_resp = client.get("/")
        self.assertEqual(root_resp.status_code, 200)

        app_resp = client.get("/app")
        self.assertEqual(app_resp.status_code, 200)

        dash_resp = client.get("/dashboard", follow_redirects=True)
        self.assertEqual(dash_resp.status_code, 200)
        self.assertIn("Engine of Prosperity", dash_resp.text)

        # 2. List Requests API
        list_resp = client.get("/api/requests")
        self.assertEqual(list_resp.status_code, 200)
        data = list_resp.json()
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 6)

        # 3. Get Single Request API
        req_id = data[0]["request_id"]
        get_resp = client.get(f"/api/requests/{req_id}")
        self.assertEqual(get_resp.status_code, 200)
        detail = get_resp.json()
        self.assertEqual(detail["request_id"], req_id)
        self.assertIn("report", detail)
        self.assertIn("guardrail_audit", detail)

        # 4. Re-evaluate API
        eval_resp = client.post(f"/api/requests/{req_id}/evaluate")
        self.assertEqual(eval_resp.status_code, 200)
        self.assertEqual(eval_resp.json()["status"], "Evaluated")
        self.assertIn("guardrail_audit", eval_resp.json())

        # 5. Create Request API
        create_resp = client.post("/api/requests", json={
            "business_id": "141",
            "grant_amount": 30000,
            "purpose": "Kitchen expansion",
            "business_name": "Binis Kitchen"
        })
        self.assertEqual(create_resp.status_code, 200)
        self.assertEqual(create_resp.json()["grant_amount"], 30000)

        # 6. Structured Dossier API
        dossier_resp = client.get(f"/api/requests/{req_id}/report")
        self.assertEqual(dossier_resp.status_code, 200)
        dossier_data = dossier_resp.json()
        self.assertIn("dossier", dossier_data)
        self.assertIn("charts", dossier_data["dossier"])
        self.assertIn("defense_narrative", dossier_data["dossier"])

        # 7. Standalone Committee Pitch HTML Report with Charts on Top
        html_resp = client.get(f"/report/{req_id}")
        self.assertEqual(html_resp.status_code, 200)
        self.assertIn("chart.js", html_resp.text.lower())
        self.assertIn("OFFICIAL COMMITTEE PITCH DOSSIER", html_resp.text)
        self.assertIn("Visual Proof of Economic Multiplier", html_resp.text)

    def test_multistage_copilot_tools(self):
        """Verifies that all 6 granular multi-stage tools callable by the conversational copilot return valid data."""
        from app.agent import (
            traverse_upstream_supply_chain,
            model_direct_and_cascade_jobs,
            audit_tract_equity_and_poverty,
            scan_upstream_sba_chargeoffs,
            evaluate_counterfactual_comparison,
            compile_committee_pitch_deck
        )

        biz_id = "114"

        # Stage 1: GQL Traversal
        s1 = json.loads(traverse_upstream_supply_chain(biz_id))
        self.assertEqual(s1["stage"], "STAGE_1_GRAPH_TRAVERSAL")
        self.assertGreater(s1["upstream_suppliers_count"], 0)

        # Stage 2: LEHD Job Modeling
        s2 = json.loads(model_direct_and_cascade_jobs(biz_id, grant_amount=50000))
        self.assertEqual(s2["stage"], "STAGE_2_EMPLOYMENT_MODELING")
        self.assertGreaterEqual(s2["total_community_job_footprint"], s2["direct_jobs"])
        self.assertGreater(s2["net_cost_per_job_saved"], 0)

        # Stage 3: Tract Equity Audit
        s3 = json.loads(audit_tract_equity_and_poverty(biz_id))
        self.assertEqual(s3["stage"], "STAGE_3_TRACT_EQUITY_AUDIT")
        self.assertTrue("poverty" in s3["neighborhood_poverty_rate"].lower() or "%" in s3["neighborhood_poverty_rate"])

        # Stage 4: SBA Fragility Scan
        s4 = json.loads(scan_upstream_sba_chargeoffs(biz_id))
        self.assertEqual(s4["stage"], "STAGE_4_SBA_FRAGILITY_SCAN")
        self.assertIn("solvency_status", s4)

        # Stage 5: Counterfactual Defense
        s5 = json.loads(evaluate_counterfactual_comparison(biz_id, grant_amount=50000))
        self.assertEqual(s5["stage"], "STAGE_5_COUNTERFACTUAL_RUNNER_UP_DEFENSE")
        self.assertIn("naive_distress_runner_up", s5)
        self.assertIn("hub_exclusion_rule", s5)

        # Stage 6: Committee Pitch Deck
        s6 = json.loads(compile_committee_pitch_deck(biz_id, grant_amount=50000))
        self.assertEqual(s6["stage"], "STAGE_6_PITCH_DECK_ASSEMBLY")
        self.assertEqual(len(s6["slides"]), 5)
        self.assertIn("official_roll_call_motion", s6)


if __name__ == "__main__":
    unittest.main()
