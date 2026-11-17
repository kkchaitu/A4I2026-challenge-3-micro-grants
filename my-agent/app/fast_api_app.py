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

from a2a.server.tasks import InMemoryTaskStore
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from pydantic import BaseModel
from google.adk.cli.fast_api import get_fast_api_app
from google.adk.runners import Runner

from app.app_utils import services
from app.app_utils.a2a import attach_a2a_routes
from app.app_utils.reasoning_engine_adapter import (
    attach_reasoning_engine_routes,
)
from app.requests_store import store
from app.metrics_service import calculate_applicant_metrics

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

# Proxy routes so the Google Cloud console playground (reasoning_engine SDK) can
# talk to this agent alongside the native adk_api routes.
attach_reasoning_engine_routes(app)


# --- GRANT OFFICER UI & APPLICATION QUEUE ROUTES ---

class CreateApplicationInput(BaseModel):
    business_id: str
    grant_amount: int
    purpose: str
    business_name: Optional[str] = None


# Override default ADK root redirect so the root URL opens our Grant Officer Dashboard directly
for _i, _route in enumerate(app.routes):
    if getattr(_route, "path", None) == "/":
        app.routes.pop(_i)
        break


@app.get("/", response_class=HTMLResponse)
@app.get("/dashboard", response_class=HTMLResponse)
async def get_dashboard():
    """Serves the Grant Officer interactive decision dashboard."""
    template_path = os.path.join(AGENT_DIR, "app", "templates", "dashboard.html")
    if not os.path.exists(template_path):
        raise HTTPException(status_code=404, detail="Dashboard template not found.")
    with open(template_path, "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())


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
    new_req = store.create_request(
        business_id=payload.business_id,
        grant_amount=payload.grant_amount,
        purpose=payload.purpose,
        business_name=payload.business_name,
    )
    return new_req


@app.get("/api/metrics/{business_id}")
async def get_metrics(business_id: str, amount: int = 50000, purpose: str = "Expansion"):
    """Direct lookup of 4-pillar metrics for any business ID in the corridor."""
    return calculate_applicant_metrics(business_id, amount, purpose)


# Main execution
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
