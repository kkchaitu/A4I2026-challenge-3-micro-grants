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

import pytest
from fastapi.testclient import TestClient

from app.metrics_service import calculate_applicant_metrics, _generate_simulated_metrics
from app.requests_store import store
from app.fast_api_app import app


def test_metrics_calculation_structure():
    """Verifies that metrics return the required 4-pillar structure and recommendation."""
    # Test with real business or simulated
    metrics = calculate_applicant_metrics(business_id="114", grant_amount=50000, purpose="Acoustics upgrade")

    assert "roi" in metrics
    assert "equity" in metrics
    assert "resilience" in metrics
    assert "risk" in metrics
    assert "overall_score" in metrics
    assert "rating" in metrics
    assert "rating_color" in metrics

    # Pillar 1: ROI
    roi = metrics["roi"]
    assert "direct_jobs" in roi
    assert "indirect_jobs" in roi
    assert "total_job_footprint" in roi
    assert "cost_per_job" in roi
    assert "job_multiplier" in roi
    assert roi["total_job_footprint"] >= roi["direct_jobs"]

    # Pillar 2: Equity
    equity = metrics["equity"]
    assert "neighborhood_poverty_rate" in equity
    assert "supply_chain_poverty_footprint" in equity

    # Pillar 3: Resilience
    resilience = metrics["resilience"]
    assert "industry_concentration_risk" in resilience
    assert "supply_chain_breadth" in resilience
    assert "supplier_industry_variety" in resilience

    # Pillar 4: Risk
    risk = metrics["risk"]
    assert "cascade_depth_hops" in risk
    assert "fragility_flag" in risk


def test_simulated_fallback():
    """Verifies fallback generation if offline or business not found."""
    sim = _generate_simulated_metrics(business_id="fake_999", grant_amount=25000, purpose="Testing")
    assert sim["business_id"] == "fake_999"
    assert sim["roi"]["total_job_footprint"] > 0
    assert sim["rating"] in ["STRONGLY RECOMMEND", "RECOMMEND", "CONSIDER WITH CONDITIONS", "HIGH RISK / REVIEW"]


def test_requests_store_operations():
    """Verifies listing, retrieving, and creating applications."""
    reqs = store.list_requests()
    assert len(reqs) >= 6

    # Verify summary structure
    first = reqs[0]
    assert "request_id" in first
    assert "business_name" in first
    assert "direct_jobs" in first
    assert "indirect_jobs" in first
    assert "total_job_footprint" in first
    assert "overall_score" in first
    assert "rating" in first

    # Retrieve single
    detail = store.get_request(first["request_id"])
    assert detail is not None
    assert "report" in detail
    assert "memo" in detail
    assert "Executive Grant Memorandum" in detail["memo"]

    # Create new application
    new_app = store.create_request(
        business_id="171",
        grant_amount=75000,
        purpose="Server infrastructure upgrade",
        business_name="Tradespace Tech"
    )
    assert new_app["request_id"].startswith("REQ-2026-")
    assert new_app["grant_amount"] == 75000
    assert new_app["business_name"] == "Tradespace Tech"


def test_api_routes():
    """Verifies FastAPI endpoints for dashboard and API."""
    client = TestClient(app)

    # 1. Frontend HTML (accessible at / and /app, and standalone dashboard at /dashboard)
    root_resp = client.get("/")
    assert root_resp.status_code == 200

    app_resp = client.get("/app")
    assert app_resp.status_code == 200

    dash_resp = client.get("/dashboard", follow_redirects=True)
    assert dash_resp.status_code == 200
    assert "Engine of Prosperity" in dash_resp.text

    # 2. List Requests API
    list_resp = client.get("/api/requests")
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert isinstance(data, list)
    assert len(data) >= 6

    # 3. Get Single Request API
    req_id = data[0]["request_id"]
    get_resp = client.get(f"/api/requests/{req_id}")
    assert get_resp.status_code == 200
    detail = get_resp.json()
    assert detail["request_id"] == req_id
    assert "report" in detail

    # 4. Re-evaluate API
    eval_resp = client.post(f"/api/requests/{req_id}/evaluate")
    assert eval_resp.status_code == 200
    assert eval_resp.json()["status"] == "Evaluated"

    # 5. Create Request API
    create_resp = client.post("/api/requests", json={
        "business_id": "141",
        "grant_amount": 30000,
        "purpose": "Kitchen expansion",
        "business_name": "Binis Kitchen"
    })
    assert create_resp.status_code == 200
    assert create_resp.json()["grant_amount"] == 30000

    # 6. Structured Dossier API
    dossier_resp = client.get(f"/api/requests/{req_id}/report")
    assert dossier_resp.status_code == 200
    dossier_data = dossier_resp.json()
    assert "dossier" in dossier_data
    assert "charts" in dossier_data["dossier"]
    assert "defense_narrative" in dossier_data["dossier"]

    # 7. Standalone Committee Pitch HTML Report with Charts on Top
    html_resp = client.get(f"/report/{req_id}")
    assert html_resp.status_code == 200
    assert "chart.js" in html_resp.text.lower()
    assert "OFFICIAL COMMITTEE PITCH DOSSIER" in html_resp.text
    assert "Visual Proof of Economic Multiplier" in html_resp.text


def test_multistage_copilot_tools():
    """Verifies that all 6 granular multi-stage tools callable by the conversational copilot return valid data."""
    import json
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
    assert s1["stage"] == "STAGE_1_GRAPH_TRAVERSAL"
    assert s1["upstream_suppliers_count"] > 0

    # Stage 2: LEHD Job Modeling
    s2 = json.loads(model_direct_and_cascade_jobs(biz_id, grant_amount=50000))
    assert s2["stage"] == "STAGE_2_EMPLOYMENT_MODELING"
    assert s2["total_community_job_footprint"] >= s2["direct_jobs"]
    assert s2["net_cost_per_job_saved"] > 0

    # Stage 3: Tract Equity Audit
    s3 = json.loads(audit_tract_equity_and_poverty(biz_id))
    assert s3["stage"] == "STAGE_3_TRACT_EQUITY_AUDIT"
    assert "poverty" in s3["neighborhood_poverty_rate"].lower() or "%" in s3["neighborhood_poverty_rate"]

    # Stage 4: SBA Fragility Scan
    s4 = json.loads(scan_upstream_sba_chargeoffs(biz_id))
    assert s4["stage"] == "STAGE_4_SBA_FRAGILITY_SCAN"
    assert "solvency_status" in s4

    # Stage 5: Counterfactual Defense
    s5 = json.loads(evaluate_counterfactual_comparison(biz_id, grant_amount=50000))
    assert s5["stage"] == "STAGE_5_COUNTERFACTUAL_RUNNER_UP_DEFENSE"
    assert "naive_distress_runner_up" in s5
    assert "hub_exclusion_rule" in s5

    # Stage 6: Committee Pitch Deck
    s6 = json.loads(compile_committee_pitch_deck(biz_id, grant_amount=50000))
    assert s6["stage"] == "STAGE_6_PITCH_DECK_ASSEMBLY"
    assert len(s6["slides"]) == 5
    assert "official_roll_call_motion" in s6

