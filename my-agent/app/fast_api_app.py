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

import contextlib
import os
from collections.abc import AsyncIterator
from typing import Optional

import json
from a2a.server.tasks import InMemoryTaskStore
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from google.adk.cli.fast_api import get_fast_api_app
from google.adk.runners import Runner

from app.guardrails import audit_grant_guardrails

from app.app_utils import services
from app.app_utils.a2a import attach_a2a_routes
from app.app_utils.reasoning_engine_adapter import (
    attach_reasoning_engine_routes,
)
from app.requests_store import store
from app.metrics_service import calculate_applicant_metrics
from app.report_html_generator import render_committee_report_html

load_dotenv()
allow_origins = (
    os.getenv("ALLOW_ORIGINS", "").split(",") if os.getenv("ALLOW_ORIGINS") else None
)
otel_to_cloud = os.environ.get(
    "GOOGLE_CLOUD_AGENT_ENGINE_ENABLE_TELEMETRY", ""
).lower() in ("true", "1")

AGENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    from app.agent import app as adk_app
    from app.agent import root_agent

    runner = Runner(
        app=adk_app,
        session_service=services.get_session_service(),
        artifact_service=services.get_artifact_service(),
        auto_create_session=True,
    )
    app.state.runner = runner
    app.state.agent_app_name = adk_app.name
    await attach_a2a_routes(
        app,
        agent=root_agent,
        runner=runner,
        task_store=InMemoryTaskStore(),
        rpc_path=f"/a2a/{adk_app.name}",
    )
    yield


app: FastAPI = get_fast_api_app(
    agents_dir=AGENT_DIR,
    web=True,
    artifact_service_uri=services.ARTIFACT_SERVICE_URI,
    allow_origins=allow_origins,
    session_service_uri=services.SESSION_SERVICE_URI,
    otel_to_cloud=otel_to_cloud,
    lifespan=lifespan,
)
app.title = "Engine of Prosperity - Grant Decision Agent"
app.description = "API and Dashboard for Economic Resilience and Micro-Grants Decision Support"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Proxy routes so the Google Cloud console playground (reasoning_engine SDK) can
# talk to this agent alongside the native adk_api routes.
attach_reasoning_engine_routes(app)


# --- GRANT OFFICER UI & APPLICATION QUEUE ROUTES ---

class CreateApplicationInput(BaseModel):
    business_id: str = Field(..., min_length=1, max_length=50, pattern=r"^[a-zA-Z0-9_\-]+$")
    grant_amount: int = Field(..., ge=1000, le=100000, description="Grant amount between $1,000 and $100,000")
    purpose: str = Field(..., min_length=3, max_length=500)
    business_name: Optional[str] = None


# Path to front-end dist directory (checks app/static/react_dist first for Docker, then dev path)
FRONTEND_DIST = os.path.join(AGENT_DIR, "app", "static", "react_dist")
if not os.path.exists(FRONTEND_DIST):
    FRONTEND_DIST = os.path.abspath(os.path.join(AGENT_DIR, "..", "front-end", "dist"))

if os.path.exists(os.path.join(FRONTEND_DIST, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="react-assets")

# Override default ADK root redirect so the root URL opens our combined frontend
for _i, _route in enumerate(app.routes):
    if getattr(_route, "path", None) == "/":
        app.routes.pop(_i)
        break


@app.get("/", response_class=HTMLResponse)
async def get_root_app():
    """Serves the combined React application if built, falling back to dashboard."""
    react_index = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.exists(react_index):
        with open(react_index, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return await get_dashboard()


@app.get("/app", response_class=HTMLResponse)
async def get_react_app():
    """Explicitly serves the combined React application."""
    react_index = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.exists(react_index):
        with open(react_index, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return await get_dashboard()


@app.get("/dashboard")
async def get_dashboard():
    """Redirects to root to provide a single unified application experience."""
    return RedirectResponse(url="/", status_code=302)


@app.get("/api/requests")
async def list_requests():
    """Returns all incoming grant requests with summary metrics and ratings."""
    return store.list_requests()


@app.get("/api/requests/{request_id}")
async def get_request(request_id: str):
    """Returns the full report, 4-pillar breakdown, supplier network, and agent memo."""
    req = store.get_request(request_id)
    if not req:
        raise HTTPException(status_code=404, detail=f"Application {request_id} not found.")
    return req


@app.get("/api/requests/{request_id}/report")
async def get_request_report(request_id: str):
    """Returns structured committee pitch dossier data and Chart.js datasets."""
    req = store.get_request(request_id)
    if not req:
        raise HTTPException(status_code=404, detail=f"Application {request_id} not found.")
    dossier = store.get_dossier(request_id)
    return {
        "request_id": request_id,
        "business_id": req["business_id"],
        "business_name": req["business_name"],
        "grant_amount": req["grant_amount"],
        "dossier": dossier,
    }


@app.get("/report/{request_id}", response_class=HTMLResponse)
async def view_standalone_report(request_id: str):
    """Serves the full-page executive committee pitch HTML report with Chart.js proof graphs."""
    req = store.get_request(request_id)
    if not req:
        raise HTTPException(status_code=404, detail=f"Application {request_id} not found.")
    return HTMLResponse(content=render_committee_report_html(req))


@app.post("/api/requests/{request_id}/evaluate")
async def evaluate_request(request_id: str):
    """Re-runs graph traversal & metrics calculation, refreshing the grant memo."""
    req = store.evaluate_request(request_id)
    if not req:
        raise HTTPException(status_code=404, detail=f"Application {request_id} not found.")
    return req


@app.post("/api/requests")
async def create_request(payload: CreateApplicationInput):
    """Submits a new grant application and evaluates it immediately."""
    try:
        new_req = store.create_request(
            business_id=payload.business_id,
            grant_amount=payload.grant_amount,
            purpose=payload.purpose,
            business_name=payload.business_name,
        )
        return new_req
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/guardrails/status")
async def get_guardrails_status():
    """Returns the active safety policies and operational boundaries."""
    return {
        "status": "active",
        "agent": "Engine of Prosperity - Grant Decision Agent",
        "policies": {
            "budget": {
                "min_grant_amount": 1000,
                "max_grant_amount": 100000,
                "currency": "USD",
                "escalation_policy": "Requests over $100,000 require City Council and SBA bond issuance review."
            },
            "sql_safety": {
                "mode": "READ_ONLY_ENFORCED",
                "prohibited_keywords": ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "TRUNCATE", "CREATE"],
                "max_rows": 25,
                "allowed_datasets": ["a4i_econ", "bigquery-public-data"]
            },
            "fair_lending": {
                "regulation": "Equal Credit Opportunity Act (ECOA) & Civil Rights Act",
                "demographic_filtering": "PROHIBITED",
                "equity_scoring_basis": "Neighborhood census tract poverty rate (American Community Survey)"
            },
            "data_disclosures": {
                "mandatory": True,
                "disclosures": [
                    "Bureau of Economic Analysis (BEA) direct requirements input-output model",
                    "LEHD employer block group geographic employment allocation model"
                ]
            }
        }
    }


@app.get("/api/guardrails/audit/{business_id}")
async def audit_business_guardrails(business_id: str, amount: int = 50000, purpose: str = "Expansion"):
    """Runs a live 5-point guardrail and regulatory compliance audit for a business."""
    report_json = audit_grant_guardrails(business_id, amount, purpose)
    return json.loads(report_json)


@app.get("/api/metrics/{business_id}")
async def get_metrics(business_id: str, amount: int = 50000, purpose: str = "Expansion"):
    """Direct lookup of 4-pillar metrics for any business ID in the corridor."""
    return calculate_applicant_metrics(business_id, amount, purpose)


# Main execution
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
