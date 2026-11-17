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

"""
In-memory store and registry for incoming grant/loan applications.
"""

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.metrics_service import calculate_applicant_metrics, _generate_simulated_metrics
from app.guardrails import validate_grant_parameters, audit_grant_guardrails

# Pre-seeded incoming requests using real businesses from a4i_econ.businesses
INITIAL_APPLICATIONS = [
    {
        "request_id": "REQ-2026-001",
        "business_id": "114",
        "business_name": "The Warfield Theater",
        "grant_amount": 50000,
        "purpose": "Stage acoustics modernization and supplier contract expansion",
        "submitted_at": "2026-11-15T14:32:00Z",
        "status": "Evaluated",
    },
    {
        "request_id": "REQ-2026-002",
        "business_id": "141",
        "business_name": "Binis Kitchen LLC",
        "grant_amount": 35000,
        "purpose": "Commercial kitchen equipment upgrade and local packaging supplier expansion",
        "submitted_at": "2026-11-16T09:15:00Z",
        "status": "Evaluated",
    },
    {
        "request_id": "REQ-2026-003",
        "business_id": "103",
        "business_name": "City Produce",
        "grant_amount": 40000,
        "purpose": "Cold-chain refrigeration and regional wholesale food delivery expansion",
        "submitted_at": "2026-11-16T11:45:00Z",
        "status": "Evaluated",
    },
    {
        "request_id": "REQ-2026-004",
        "business_id": "169",
        "business_name": "Golden Auto Muffler & Brake Sf Co.",
        "grant_amount": 60000,
        "purpose": "Electric vehicle diagnostic gear and regional parts supply chain contracts",
        "submitted_at": "2026-11-17T08:20:00Z",
        "status": "Pending Review",
    },
    {
        "request_id": "REQ-2026-005",
        "business_id": "170",
        "business_name": "Mo'z Cafe Inc",
        "grant_amount": 25000,
        "purpose": "Corridor dining winterization and local artisan bakery sourcing",
        "submitted_at": "2026-11-17T10:05:00Z",
        "status": "Pending Review",
    },
    {
        "request_id": "REQ-2026-006",
        "business_id": "60",
        "business_name": "Bluebird Office Supplies",
        "grant_amount": 45000,
        "purpose": "Eco-friendly distribution logistics and commercial printing equipment",
        "submitted_at": "2026-11-17T12:30:00Z",
        "status": "Pending Review",
    },
]


class RequestsStore:
    """Manages grant applications and cached evaluation reports."""

    def __init__(self):
        self._requests: Dict[str, Dict[str, Any]] = {}
        self._init_defaults()

    def _init_defaults(self):
        """Pre-seeds applications with initial fast estimates for instant startup."""
        for app in INITIAL_APPLICATIONS:
            req_id = app["request_id"]
            # Fast deterministic initial metrics so import is instant
            report = _generate_simulated_metrics(
                business_id=app["business_id"],
                grant_amount=app["grant_amount"],
                purpose=app["purpose"],
            )
            report["business_name"] = app["business_name"]
            
            memo = self._generate_default_memo(app, report)

            audit = json.loads(audit_grant_guardrails(app["business_id"], app["grant_amount"], app["purpose"]))

            self._requests[req_id] = {
                "request_id": req_id,
                "business_id": app["business_id"],
                "business_name": app["business_name"],
                "grant_amount": app["grant_amount"],
                "purpose": app["purpose"],
                "submitted_at": app["submitted_at"],
                "status": app["status"],
                "report": report,
                "memo": memo,
                "guardrail_audit": audit,
            }

    def _generate_default_memo(self, app: Dict[str, Any], report: Dict[str, Any]) -> str:
        roi = report.get("roi", {})
        equity = report.get("equity", {})
        resilience = report.get("resilience", {})
        risk = report.get("risk", {})

        return (
            f"### Executive Grant Memorandum\n\n"
            f"**Applicant:** {report.get('business_name')} (ID: {report.get('business_id')})\n"
            f"**Proposed Grant:** ${app['grant_amount']:,}\n"
            f"**Recommendation Tier:** **{report.get('rating')}** (Score: {report.get('overall_score')}/100)\n\n"
            f"#### 1. Employment Multiplier Justification\n"
            f"Allocating ${app['grant_amount']:,} directly leverages an estimated **{roi.get('direct_jobs', 0)} direct jobs** "
            f"and sustains **{roi.get('indirect_jobs', 0)} indirect jobs** across {resilience.get('supply_chain_breadth', 0)} "
            f"distinct upstream suppliers. This generates a total corridor footprint of **{roi.get('total_job_footprint', 0)} jobs**, "
            f"achieving an exceptional ROI of **${roi.get('cost_per_job', 0):,.2f} per job** supported (Multiplier: {roi.get('job_multiplier', 1.0)}x).\n\n"
            f"#### 2. Equity & Need Targeting\n"
            f"The applicant operates in a census tract with a **{equity.get('neighborhood_poverty_rate', 'N/A')}** poverty rate. "
            f"Downstream supply chain spend channels into supplier tracts averaging **{equity.get('supply_chain_poverty_footprint', 'N/A')}** poverty, "
            f"ensuring grant dollars circulate into historically underfunded zones.\n\n"
            f"#### 3. Diversification & Risk\n"
            f"Sector concentration in this corridor stands at **{resilience.get('industry_concentration_risk', 'N/A')}** "
            f"(Concentration Risk: {'Elevated' if resilience.get('concentration_flag') else 'Low'}). "
            f"SBA charge-off scan of upstream partners reveals **{risk.get('fragile_suppliers_count', 0)} defaulted suppliers** "
            f"(Fragility Flag: {'Active' if risk.get('fragility_flag') else 'Clear'}).\n\n"
            f"**Methodological Disclosure:** Supplier relationships are derived via BEA input-output coefficients mapped "
            f"geographically, and direct employment figures are modeled from LEHD employer block groups."
        )

    def list_requests(self) -> List[Dict[str, Any]]:
        """Returns the list of all requests with summary metrics."""
        summaries = []
        for req in self._requests.values():
            report = req.get("report", {})
            roi = report.get("roi", {})
            equity = report.get("equity", {})
            resilience = report.get("resilience", {})

            summaries.append({
                "request_id": req["request_id"],
                "business_id": req["business_id"],
                "business_name": req["business_name"],
                "grant_amount": req["grant_amount"],
                "purpose": req["purpose"],
                "submitted_at": req["submitted_at"],
                "status": req["status"],
                # Summary metrics for list view
                "direct_jobs": roi.get("direct_jobs", 0),
                "indirect_jobs": roi.get("indirect_jobs", 0),
                "total_job_footprint": roi.get("total_job_footprint", 0),
                "cost_per_job": roi.get("cost_per_job", 0),
                "job_multiplier": roi.get("job_multiplier", 1.0),
                "neighborhood_poverty_rate": equity.get("neighborhood_poverty_rate", "N/A"),
                "supply_chain_breadth": resilience.get("supply_chain_breadth", 0),
                "overall_score": report.get("overall_score", 0),
                "rating": report.get("rating", "PENDING"),
                "rating_color": report.get("rating_color", "slate"),
                "guardrail_status": req.get("guardrail_audit", {}).get("overall_status", "PASSED"),
            })
        # Sort by overall score descending
        summaries.sort(key=lambda x: x["overall_score"], reverse=True)
        return summaries

    def get_request(self, request_id: str) -> Optional[Dict[str, Any]]:
        """Returns full request record including report and memo."""
        return self._requests.get(request_id)

    def get_dossier(self, request_id: str) -> Optional[Dict[str, Any]]:
        """Returns the structured committee pitch dossier and chart datasets."""
        req = self._requests.get(request_id)
        if not req:
            return None
        return req.get("report", {}).get("dossier")

    def evaluate_request(self, request_id: str, custom_memo: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Re-evaluates the request using live BigQuery graph traversal and updates memo."""
        req = self._requests.get(request_id)
        if not req:
            return None

        report = calculate_applicant_metrics(
            business_id=req["business_id"],
            grant_amount=req["grant_amount"],
            purpose=req["purpose"],
        )
        req["business_name"] = report.get("business_name") or req["business_name"]
        req["report"] = report
        req["status"] = "Evaluated"
        req["guardrail_audit"] = json.loads(
            audit_grant_guardrails(req["business_id"], req["grant_amount"], req["purpose"])
        )
        if custom_memo:
            req["memo"] = custom_memo
        else:
            req["memo"] = self._generate_default_memo(req, report)

        return req

    def create_request(self, business_id: str, grant_amount: int, purpose: str, business_name: Optional[str] = None) -> Dict[str, Any]:
        """Creates a new grant application and evaluates it."""
        # Parameter & budget guardrail validation
        is_valid, err_msg = validate_grant_parameters(business_id, grant_amount, purpose)
        if not is_valid:
            raise ValueError(err_msg)

        new_id = f"REQ-2026-{len(self._requests) + 1:03d}"
        report = calculate_applicant_metrics(
            business_id=business_id,
            grant_amount=grant_amount,
            purpose=purpose,
        )
        resolved_name = business_name or report.get("business_name") or f"Applicant #{business_id}"
        audit = json.loads(audit_grant_guardrails(business_id, grant_amount, purpose))
        app_record = {
            "request_id": new_id,
            "business_id": business_id,
            "business_name": resolved_name,
            "grant_amount": grant_amount,
            "purpose": purpose,
            "submitted_at": datetime.now(timezone.utc).isoformat(),
            "status": "Evaluated",
            "report": report,
            "guardrail_audit": audit,
        }
        app_record["memo"] = self._generate_default_memo(app_record, report)
        self._requests[new_id] = app_record
        return app_record


# Global singleton instance
store = RequestsStore()
