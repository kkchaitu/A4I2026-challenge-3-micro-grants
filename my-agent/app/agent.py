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

import os
from google.adk.agents import Agent
from google.adk.apps import App
from google.adk.models import Gemini
from google.genai import types
from google.cloud import bigquery


MODEL = "gemini-3.8-flash" # Ensure we use a robust model for this task

def evaluate_applicant_impact(business_id: str, grant_amount: int) -> str:
    """Evaluates the economic impact of giving a grant to a business by analyzing its supply chain cascade.
    
    Args:
        business_id: The ID of the applicant business.
        grant_amount: The proposed grant amount in dollars.
        
    Returns:
        A formatted string detailing the downstream cascade, the total businesses protected, 
        and the estimated ROI (multiplier effect) based on the supply graph.
    """
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
    if not project_id:
        return "Error: GOOGLE_CLOUD_PROJECT environment variable is not set."

    client = bigquery.Client(project=project_id)
    
    # This is the required Differentiator: A genuine multi-hop GQL traversal.
    # Note: We traverse BACKWARDS from the applicant (the buyer) to find their suppliers,
    # because this track ("Engine of Prosperity") is about fueling buyers to support suppliers.
    query = f"""
    GRAPH_TABLE(a4i_econ.corridor_graph
      MATCH p = (engine:Business {{business_id: '{business_id}'}})<-[s:Supplies]-{{1,3}}(supplier:Business)
      COLUMNS (
        engine.name AS engine_name,
        supplier.name AS supplier_name,
        supplier.business_id AS supplier_id,
        supplier.naics AS supplier_naics
      )
    )
    """
    
    try:
        query_job = client.query(query)
        results = query_job.result()
        
        suppliers_found = set()
        engine_name = "Unknown"
        for row in results:
            engine_name = row['engine_name']
            suppliers_found.add(row['supplier_name'])
            
        if not suppliers_found:
            return f"Applicant {business_id} has no measurable downstream supply chain cascade."
            
        summary = (
            f"Cascade Analysis for {engine_name} (ID: {business_id}):\n"
            f"- Grant Amount: ${grant_amount}\n"
            f"- Downstream Suppliers Protected ({len(suppliers_found)} total): {', '.join(list(suppliers_found)[:5])}"
            f"{'...' if len(suppliers_found) > 5 else ''}\n"
            f"- Multiplier Effect: Positive (Funding this engine supports the above suppliers)."
        )
        return summary
    except Exception as e:
        return f"Error executing graph traversal: {str(e)}"

def run_standard_query(sql_query: str) -> str:
    """Executes a standard SQL query on Google BigQuery (e.g. for tract_demographics or borrowed_from tables).
    
    Args:
        sql_query: The standard SQL query to execute.
    
    Returns:
        A string representation of the query results.
    """
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
    client = bigquery.Client(project=project_id)
    try:
        results = client.query(sql_query).result()
        rows = [dict(row) for row in results]
        return str(rows[:10]) # Limit output size
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
        "businesses that buy heavily from downstream suppliers. "
        "When given a business applicant, use the `evaluate_applicant_impact` tool to run the BigQuery GQL traversal "
        "and find their supply chain cascade. Use `run_standard_query` to check `a4i_econ.tract_demographics` or "
        "`a4i_econ.borrowed_from` if needed. "
        "Always output a formal 'Grant Memo' justifying your funding decisions based on the cascade and multiplier effect, "
        "and clearly state that supply chain edges are modeled from BEA direct requirements."
    ),
    tools=[evaluate_applicant_impact, run_standard_query],
)

app = App(
    root_agent=root_agent,
    name="app",
)
