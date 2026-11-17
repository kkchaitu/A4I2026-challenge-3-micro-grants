# ruff: noqa
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
import os
from google.adk.agents import Agent
from google.adk.apps import App
from google.adk.models import Gemini
from google.genai import types
from google.cloud import bigquery

from app.metrics_service import calculate_applicant_metrics
from app.guardrails import (
    validate_sql_query,
    validate_grant_parameters,
    audit_grant_guardrails,
    before_tool_guardrail_callback,
    before_model_guardrail_callback,
    after_model_guardrail_callback,
)


MODEL = "gemini-3.8-flash"  # Ensure we use a robust model for this task


def evaluate_applicant_impact(business_id: str, grant_amount: int) -> str:
    """Evaluates the economic impact of giving a grant to a business by analyzing its supply chain cascade.
    
    Args:
        business_id: The ID of the applicant business.
        grant_amount: The proposed grant amount in dollars.
        
    Returns:
        A formatted string detailing the downstream cascade, the total businesses protected, 
        and the estimated ROI (multiplier effect) based on the supply graph.
    """
    # Guardrail Check
    is_valid, err_msg = validate_grant_parameters(business_id, grant_amount)
    if not is_valid:
        return err_msg

    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
    if not project_id:
        try:
            import subprocess
            project_id = subprocess.check_output(
                ["gcloud", "config", "get-value", "project"],
                text=True,
                stderr=subprocess.DEVNULL
            ).strip()
        except Exception:
            pass

    if not project_id:
        return "Error: GOOGLE_CLOUD_PROJECT environment variable is not set."

    client = bigquery.Client(project=project_id)
    
    # Required Differentiator: Multi-hop backward GQL traversal from applicant (buyer) to suppliers
    query = f"""
    SELECT * FROM GRAPH_TABLE(a4i_econ.corridor_graph
      MATCH (engine:Business {{business_id: '{business_id}'}})<-[s:Supplies]-{{1,3}}(supplier:Business)
      COLUMNS (
        engine.name AS engine_name,
        supplier.name AS supplier_name,
        supplier.business_id AS supplier_id,
        supplier.naics AS supplier_naics,
        supplier.estimated_jobs AS supplier_estimated_jobs
      )
    )
    """
    
    try:
        query_job = client.query(query)
        results = list(query_job.result())
        
        suppliers_found = set()
        total_indirect_jobs = 0
        engine_name = "Unknown"
        for row in results:
            engine_name = row['engine_name']
            if row['supplier_id'] not in suppliers_found:
                suppliers_found.add(row['supplier_id'])
                total_indirect_jobs += int(row['supplier_estimated_jobs'] or 0)
            
        if not suppliers_found:
            return f"Applicant {business_id} has no measurable downstream supply chain cascade in the corridor graph."
            
        summary = (
            f"Cascade Analysis for {engine_name} (ID: {business_id}):\n"
            f"- Grant Amount: ${grant_amount:,}\n"
            f"- Upstream Suppliers Reached ({len(suppliers_found)} total): {len(suppliers_found)} distinct businesses\n"
            f"- Total Indirect Jobs Sustained: {total_indirect_jobs} jobs\n"
            f"- Downstream Multiplier: Positive economic ripple back into supplier network."
        )
        return summary
    except Exception as e:
        return f"Error executing graph traversal: {str(e)}"


def get_track_metrics_report(business_id: str, grant_amount: int, purpose: str = "Expansion") -> str:
    """Computes the full 4-pillar metrics report (ROI, Equity, Resilience, Risk) for an applicant.
    
    Args:
        business_id: The ID of the applicant business.
        grant_amount: The requested grant or loan amount.
        purpose: Stated business purpose or expansion plan.
        
    Returns:
        JSON string with all metrics, overall score, and recommendation tier.
    """
    # Guardrail Check
    is_valid, err_msg = validate_grant_parameters(business_id, grant_amount, purpose)
    if not is_valid:
        return json.dumps({"error": err_msg, "status": "BLOCKED_BY_GUARDRAIL"}, indent=2)

    metrics = calculate_applicant_metrics(business_id, grant_amount, purpose)
    return json.dumps(metrics, indent=2)


def run_standard_query(sql_query: str) -> str:
    """Executes a standard SQL query on Google BigQuery (e.g. for tract_demographics or borrowed_from tables).
    
    Args:
        sql_query: The standard SQL query to execute.
    
    Returns:
        A string representation of the query results.
    """
    # Guardrail Check: Ensure read-only, permitted keywords, and row limits
    is_safe, reason, sanitized_query = validate_sql_query(sql_query)
    if not is_safe:
        return f"Query Blocked by Guardrail: {reason}"

    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
    client = bigquery.Client(project=project_id)
    try:
        results = client.query(sanitized_query).result()
        rows = [dict(row) for row in results]
        return str(rows[:10])  # Limit output size
    except Exception as e:
        return f"Query Error: {str(e)}"


root_agent = Agent(
    name="my_agent",
    model=Gemini(
        model=MODEL,
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction=(
        "You are an Economic Development Director managing the 'Engine of Prosperity' micro-grant program. "
        "Your goal is to maximize localized job creation and economic resilience by funding 'economic engines'—"
        "businesses that purchase heavily from downstream suppliers.\n\n"
        "### OPERATIONAL RULES & GUARDRAILS:\n"
        "1. **Grant Budget Policy**: Micro-grants must strictly range between $1,000 and $100,000. Any request outside this range must be rejected or referred to City Council review.\n"
        "2. **Fair Lending & Anti-Bias (Equal Credit Opportunity Act)**: Never evaluate or filter applicants based on protected demographic attributes (race, gender, religion, etc.). Equity evaluations rely exclusively on neighborhood census tract poverty rates from ACS data.\n"
        "3. **Objective 4-Pillar Evaluation**: When evaluating applicants, use `get_track_metrics_report` to review: 1) ROI / Employment Multiplier, 2) Equity & Need, 3) Resilience, and 4) Risk.\n"
        "4. **Supply Cascade Inspection**: Use `evaluate_applicant_impact` to inspect the reverse GQL graph traversal.\n"
        "5. **Compliance & Guardrail Auditing**: Use `audit_grant_guardrails` to run policy verification on applicants.\n"
        "6. **Database Boundaries**: When using `run_standard_query`, only run read-only SELECT queries on permitted a4i_econ tables. Never execute DDL or DML.\n"
        "7. **Mandatory Methodological Disclosures**: Always output a formal 'Grant Memo' justifying decisions based on multiplier effects, "
        "and clearly disclose that supply chain edges are modeled from BEA direct requirements and direct jobs are modeled from employer blocks."
    ),
    tools=[get_track_metrics_report, evaluate_applicant_impact, run_standard_query, audit_grant_guardrails],
    before_tool_callback=before_tool_guardrail_callback,
    before_model_callback=before_model_guardrail_callback,
    after_model_callback=after_model_guardrail_callback,
    generate_content_config=types.GenerateContentConfig(
        safety_settings=[
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_JAILBREAK,
                threshold=types.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
            ),
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold=types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            ),
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold=types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            ),
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold=types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            ),
            types.SafetySetting(
                category=types.HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY,
                threshold=types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            ),
        ]
    ),
)

app = App(
    root_agent=root_agent,
    name="app",
)
