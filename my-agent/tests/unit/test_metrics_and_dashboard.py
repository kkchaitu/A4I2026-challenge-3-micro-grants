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

    # 1. Dashboard HTML (accessible at both / and /dashboard)
    root_resp = client.get("/")
    assert root_resp.status_code == 200
    assert "Engine of Prosperity" in root_resp.text

    dash_resp = client.get("/dashboard")
    assert dash_resp.status_code == 200
    assert "Engine of Prosperity" in dash_resp.text
    assert "Incoming Grant & Loan Queue" in dash_resp.text

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
