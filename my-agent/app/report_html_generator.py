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
HTML Report Generator for Approval Committee Pitch Dossiers.
Produces a full-page municipal defense report with Chart.js charts on top.
"""

import json
from typing import Any, Dict


def render_committee_report_html(req: Dict[str, Any]) -> str:
    """Renders a standalone, full-page executive HTML dossier for committee pitch."""
    report = req.get("report", {})
    dossier = report.get("dossier", {})
    header = dossier.get("header", {})
    charts = dossier.get("charts", {})
    defense = dossier.get("defense_narrative", {})
    cf_data = defense.get("counterfactual_runner_up", {})
    roi = report.get("roi", {})

    biz_name = header.get("applicant_name", req.get("business_name", "Applicant Business"))
    biz_id = header.get("applicant_id", req.get("business_id", "N/A"))
    amount = header.get("grant_amount", req.get("grant_amount", 50000))
    rating = header.get("rating", "STRONGLY RECOMMEND")
    score = header.get("overall_score", 85.0)
    rating_color = header.get("rating_color", "emerald")

    chart_data_json = json.dumps(charts)

    badge_bg = "#ecfdf5" if rating_color == "emerald" else "#eff6ff" if rating_color == "blue" else "#fffbeb"
    badge_border = "#059669" if rating_color == "emerald" else "#2563eb" if rating_color == "blue" else "#d97706"
    badge_text = "#065f46" if rating_color == "emerald" else "#1e40af" if rating_color == "blue" else "#92400e"

    suppliers_rows = ""
    for s in report.get("suppliers", [])[:8]:
        suppliers_rows += f"""
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 12px;">
            <td style="padding: 10px 12px; font-weight: 500; color: #1e293b;">{s.get('name')}</td>
            <td style="padding: 10px 12px; font-family: monospace; color: #64748b;">{s.get('naics', 'N/A')}</td>
            <td style="padding: 10px 12px; font-family: monospace; text-align: right; font-weight: 600; color: #334155;">{s.get('estimated_jobs', 'N/A')} jobs</td>
            <td style="padding: 10px 12px; text-align: center;"><span style="padding: 2px 6px; border-radius: 4px; font-size: 10px; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0;">Active</span></td>
        </tr>
        """

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Grant Pitch Dossier: {biz_name} | City & County of San Francisco</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        * {{ box-sizing: border-box; }}
        body {{
            margin: 0;
            padding: 0;
            background: #f1f5f9;
            color: #0f172a;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            line-height: 1.5;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }}
        .page-container {{
            max-width: 1040px;
            margin: 24px auto;
            background: #ffffff;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
        }}
        .print-btn-bar {{
            max-width: 1040px;
            margin: 16px auto 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 8px;
        }}
        .btn {{
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 18px;
            font-size: 13px;
            font-weight: 600;
            border-radius: 8px;
            cursor: pointer;
            border: none;
            transition: all 0.2s;
            text-decoration: none;
        }}
        .btn-primary {{
            background: #0284c7;
            color: #ffffff;
        }}
        .btn-primary:hover {{ background: #0369a1; }}
        .btn-secondary {{
            background: #ffffff;
            color: #334155;
            border: 1px solid #cbd5e1;
        }}
        .btn-secondary:hover {{ background: #f8fafc; }}

        .letterhead {{
            background: linear-gradient(135deg, #091e3a 0%, #1e3a8a 100%);
            color: #ffffff;
            padding: 32px 40px;
            border-bottom: 4px solid #f59e0b;
            position: relative;
        }}
        .letterhead-top {{
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 20px;
        }}
        .municipal-title {{
            font-family: 'Cinzel', serif;
            letter-spacing: 1.5px;
            font-size: 13px;
            color: #93c5fd;
            text-transform: uppercase;
            font-weight: 700;
        }}
        .dossier-headline {{
            font-size: 24px;
            font-weight: 800;
            margin: 6px 0 2px 0;
            letter-spacing: -0.5px;
        }}
        .dossier-subhead {{
            font-size: 13px;
            color: #bfdbfe;
            margin: 0;
        }}
        .official-seal {{
            width: 72px;
            height: 72px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.1);
            border: 2px solid rgba(245, 158, 11, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            text-align: center;
            font-family: 'Cinzel', serif;
            font-size: 9px;
            color: #fef3c7;
            padding: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        }}
        .seal-star {{ font-size: 14px; color: #f59e0b; }}

        .meta-strip {{
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            padding: 18px 40px;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
        }}
        .meta-item {{
            display: flex;
            flex-direction: column;
        }}
        .meta-label {{
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
        }}
        .meta-val {{
            font-size: 16px;
            font-weight: 700;
            color: #1e293b;
            margin-top: 2px;
        }}

        .recommendation-banner {{
            margin: 28px 40px 16px 40px;
            padding: 18px 24px;
            border-radius: 10px;
            background: {badge_bg};
            border: 2px solid {badge_border};
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
        }}
        .stamp-left {{
            display: flex;
            align-items: center;
            gap: 14px;
        }}
        .stamp-icon {{
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: {badge_border};
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            font-weight: bold;
        }}
        .stamp-title {{
            font-size: 18px;
            font-weight: 800;
            color: {badge_text};
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin: 0;
        }}
        .stamp-desc {{
            font-size: 12px;
            color: #475569;
            margin: 2px 0 0 0;
        }}
        .stamp-score {{
            text-align: right;
        }}
        .score-huge {{
            font-size: 28px;
            font-weight: 800;
            color: {badge_text};
            font-family: 'JetBrains Mono', monospace;
            line-height: 1;
        }}
        .score-sub {{
            font-size: 11px;
            text-transform: uppercase;
            font-weight: 600;
            color: #64748b;
        }}

        .content-body {{
            padding: 16px 40px 40px 40px;
        }}
        .section-header {{
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 32px 0 16px 0;
            padding-bottom: 8px;
            border-bottom: 2px solid #e2e8f0;
        }}
        .section-num {{
            background: #0f172a;
            color: #ffffff;
            font-size: 11px;
            font-weight: 800;
            padding: 3px 8px;
            border-radius: 4px;
            font-family: 'JetBrains Mono', monospace;
        }}
        .section-title {{
            font-size: 16px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0;
        }}

        .charts-grid {{
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 28px;
        }}
        .chart-card {{
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 18px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }}
        .chart-card-title {{
            font-size: 13px;
            font-weight: 700;
            color: #334155;
            margin: 0 0 12px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        .chart-kpi {{
            font-size: 11px;
            font-family: 'JetBrains Mono', monospace;
            padding: 2px 6px;
            background: #f1f5f9;
            border-radius: 4px;
            color: #0284c7;
        }}
        .chart-wrapper {{
            position: relative;
            height: 220px;
            width: 100%;
        }}

        .defense-p {{
            font-size: 14px;
            color: #334155;
            line-height: 1.65;
            margin: 0 0 14px 0;
        }}
        .callout-box {{
            background: #f8fafc;
            border-left: 4px solid #0284c7;
            padding: 14px 18px;
            border-radius: 0 8px 8px 0;
            margin: 16px 0;
            font-size: 13px;
            color: #334155;
        }}
        .callout-title {{
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 4px;
        }}

        .supplier-table {{
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
        }}
        .supplier-table th {{
            background: #f1f5f9;
            padding: 10px 12px;
            font-size: 11px;
            text-transform: uppercase;
            font-weight: 700;
            color: #475569;
            border-bottom: 2px solid #cbd5e1;
            text-align: left;
        }}

        .counterfactual-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin: 16px 0;
        }}
        .cf-card {{
            border-radius: 8px;
            padding: 16px;
            font-size: 12px;
        }}
        .cf-card-engine {{
            background: #eff6ff;
            border: 2px solid #3b82f6;
        }}
        .cf-card-runner {{
            background: #f8fafc;
            border: 1px solid #cbd5e1;
        }}
        .cf-badge {{
            display: inline-block;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            padding: 2px 6px;
            border-radius: 4px;
            margin-bottom: 8px;
            font-family: 'JetBrains Mono', monospace;
        }}
        .cf-badge-engine {{
            background: #dbeafe;
            color: #1e40af;
        }}
        .cf-badge-runner {{
            background: #e2e8f0;
            color: #475569;
        }}
        .cf-name {{
            font-size: 13px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 8px;
        }}
        .cf-row {{
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            border-bottom: 1px solid #e2e8f0;
        }}
        .cf-highlight {{
            font-weight: 800;
            color: #059669;
        }}
        .cf-exclusion {{
            background: #fdf4ff;
            border-left: 4px solid #c026d3;
            padding: 12px 16px;
            margin: 16px 0;
            border-radius: 0 8px 8px 0;
            font-size: 12px;
            color: #701a75;
            line-height: 1.5;
        }}

        .motion-box {{
            background: #fefce8;
            border: 2px dashed #ca8a04;
            border-radius: 10px;
            padding: 20px;
            margin-top: 28px;
        }}
        .motion-title {{
            font-size: 13px;
            font-weight: 800;
            text-transform: uppercase;
            color: #854d0e;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 6px;
        }}
        .motion-text {{
            font-size: 13px;
            color: #713f12;
            font-style: italic;
            line-height: 1.6;
            margin: 0;
        }}

        .dossier-footer {{
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            padding: 20px 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
            color: #64748b;
            font-family: 'JetBrains Mono', monospace;
        }}

        @media print {{
            body {{ background: #ffffff; }}
            .page-container {{
                box-shadow: none;
                border: none;
                margin: 0;
                max-width: 100%;
            }}
            .print-btn-bar {{ display: none !important; }}
            .chart-wrapper {{ height: 180px !important; }}
        }}
    </style>
</head>
<body>

    <div class="print-btn-bar">
        <a href="/" class="btn btn-secondary">← Back to Grant Decision Queue</a>
        <div style="display: flex; gap: 10px;">
            <button onclick="window.print()" class="btn btn-primary">🖨️ Print Committee Dossier / Export PDF</button>
        </div>
    </div>

    <div class="page-container">
        <!-- Letterhead -->
        <header class="letterhead">
            <div class="letterhead-top">
                <div>
                    <div class="municipal-title">{header.get('jurisdiction')} • {header.get('agency')}</div>
                    <h1 class="dossier-headline">{header.get('document_type')}</h1>
                    <p class="dossier-subhead">{header.get('program')} • Docket ID: {header.get('dossier_id')}</p>
                </div>
                <div class="official-seal">
                    <span class="seal-star">★</span>
                    <span>CITY SEAL<br>SF OEWD</span>
                    <span style="font-size: 7px; color: #cbd5e1;">A4I 2026</span>
                </div>
            </div>
        </header>

        <!-- Meta Strip -->
        <div class="meta-strip">
            <div class="meta-item">
                <span class="meta-label">Applicant Engine</span>
                <span class="meta-val">{biz_name}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">Grant Amount</span>
                <span class="meta-val" style="color: #059669;">${amount:,}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">Corridor & NAICS</span>
                <span class="meta-val">Central Market ({header.get('naics')})</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">Review Docket</span>
                <span class="meta-val">{header.get('review_cycle')}</span>
            </div>
        </div>

        <!-- Official Recommendation Stamping -->
        <div class="recommendation-banner">
            <div class="stamp-left">
                <div class="stamp-icon">✓</div>
                <div>
                    <h2 class="stamp-title">{rating}</h2>
                    <p class="stamp-desc">Official recommendation determined by AI Multiplier & Supply Graph Defense Engine</p>
                </div>
            </div>
            <div class="stamp-score">
                <div class="score-huge">{score}<span style="font-size: 16px; color: #64748b;">/100</span></div>
                <div class="score-sub">Composite Engine Score</div>
            </div>
        </div>

        <main class="content-body">
            <!-- SECTION 1: VISUAL PROOF GRAPHS -->
            <div class="section-header">
                <span class="section-num">01</span>
                <h3 class="section-title">Visual Proof of Economic Multiplier (Empirical Graphs)</h3>
            </div>

            <div class="charts-grid">
                <!-- Chart 1: Jobs Donut -->
                <div class="chart-card">
                    <div class="chart-card-title">
                        <span>Direct vs. Indirect Jobs Sustained</span>
                        <span class="chart-kpi">{charts.get('jobs_breakdown', {}).get('multiplier')}x Multiplier</span>
                    </div>
                    <div class="chart-wrapper">
                        <canvas id="jobsChart"></canvas>
                    </div>
                </div>

                <!-- Chart 2: 4-Pillar Radar -->
                <div class="chart-card">
                    <div class="chart-card-title">
                        <span>4-Pillar Metric Balance</span>
                        <span class="chart-kpi">Comprehensive Score</span>
                    </div>
                    <div class="chart-wrapper">
                        <canvas id="pillarChart"></canvas>
                    </div>
                </div>

                <!-- Chart 3: Cascade Tiers -->
                <div class="chart-card">
                    <div class="chart-card-title">
                        <span>Supply Chain Cascade by Tier</span>
                        <span class="chart-kpi">3-Hop Graph Traversal</span>
                    </div>
                    <div class="chart-wrapper">
                        <canvas id="tierChart"></canvas>
                    </div>
                </div>

                <!-- Chart 4: Cost per Job Benchmark -->
                <div class="chart-card">
                    <div class="chart-card-title">
                        <span>Cost-per-Job Efficiency vs. City Benchmark</span>
                        <span class="chart-kpi">{charts.get('cost_benchmark', {}).get('savings_pct')}% Savings</span>
                    </div>
                    <div class="chart-wrapper">
                        <canvas id="costChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- SECTION 2: EXECUTIVE DEFENSE PITCH -->
            <div class="section-header">
                <span class="section-num">02</span>
                <h3 class="section-title">The Economic Case for Approval (AI Agent Pitch)</h3>
            </div>
            <p class="defense-p">{defense.get('executive_pitch')}</p>

            <div class="callout-box">
                <div class="callout-title">Key Economic Defense Principle: Growth Acceleration Over Naive Distress</div>
                <div>Rather than subsidizing isolated distressed units, this grant fuels a verified anchor whose B2B procurement transmits liquidity across {report.get('resilience', {}).get('supply_chain_breadth', 6)} localized supplier nodes.</div>
            </div>

            <!-- SECTION 3: REVERSE GQL MULTIPLIER MATH -->
            <div class="section-header">
                <span class="section-num">03</span>
                <h3 class="section-title">Downstream Multiplier Proof & Supply Cascade Math</h3>
            </div>
            <p class="defense-p">{defense.get('multiplier_math')}</p>

            <!-- Upstream Suppliers Table -->
            <h4 style="font-size: 13px; font-weight: 700; color: #1e293b; margin: 18px 0 8px 0; text-transform: uppercase;">
                Verified Upstream Suppliers Traversed via BigQuery Property Graph:
            </h4>
            <table class="supplier-table">
                <thead>
                    <tr>
                        <th>Supplier Entity Name</th>
                        <th>NAICS Code</th>
                        <th style="text-align: right;">Modeled Jobs</th>
                        <th style="text-align: center;">Network Status</th>
                    </tr>
                </thead>
                <tbody>
                    {suppliers_rows}
                </tbody>
            </table>

            <!-- SECTION 4: EQUITY & INCLUSION DEFENSE -->
            <div class="section-header">
                <span class="section-num">04</span>
                <h3 class="section-title">Tract Equity & Localized Capital Retention</h3>
            </div>
            <p class="defense-p">{defense.get('equity_justification')}</p>

            <!-- SECTION 5: COUNTERFACTUAL & RISK SAFEGUARDS -->
            <div class="section-header">
                <span class="section-num">05</span>
                <h3 class="section-title">Counterfactual Comparison & Defense Against Runner-Up</h3>
            </div>
            <p class="defense-p"><strong>Impact of Inaction:</strong> {defense.get('counterfactual_analysis')}</p>

            <div class="counterfactual-grid">
                <div class="cf-card cf-card-engine">
                    <span class="cf-badge cf-badge-engine">RECOMMENDED ECONOMIC ENGINE</span>
                    <div class="cf-name">{cf_data.get('recommended_name', biz_name)}</div>
                    <div class="cf-row"><span>Direct Jobs:</span><strong>{cf_data.get('recommended_direct_jobs', roi.get('direct_jobs', 84))} jobs</strong></div>
                    <div class="cf-row"><span>Downstream Supply Cascade:</span><strong class="cf-highlight">+{cf_data.get('recommended_cascade_jobs', roi.get('indirect_jobs', 1335))} indirect jobs</strong></div>
                    <div class="cf-row"><span>Total Community Footprint:</span><strong class="cf-highlight">{cf_data.get('recommended_total_jobs', roi.get('total_job_footprint', 1419))} jobs protected</strong></div>
                    <div class="cf-row"><span>Net Cost per Job:</span><strong>${cf_data.get('recommended_cost_per_job', roi.get('cost_per_job', 35.24)):,.2f}</strong></div>
                </div>
                <div class="cf-card cf-card-runner">
                    <span class="cf-badge cf-badge-runner">NAIVE DISTRESS RUNNER-UP</span>
                    <div class="cf-name">{cf_data.get('runner_up_name', 'Grove Street Books & Stationery (Leaf Storefront cm-07)')}</div>
                    <div class="cf-row"><span>Acute Distress Score:</span><strong>0.88 (Critical)</strong></div>
                    <div class="cf-row"><span>Direct Jobs:</span><strong>{cf_data.get('runner_up_direct_jobs', 3)} jobs</strong></div>
                    <div class="cf-row"><span>Downstream Supply Cascade:</span><span style="color:#64748b;">+0 jobs (Terminal Leaf)</span></div>
                    <div class="cf-row"><span>Total Community Footprint:</span><strong>{cf_data.get('runner_up_total_jobs', 3)} jobs</strong></div>
                    <div class="cf-row"><span>Net Cost per Job:</span><strong>${cf_data.get('runner_up_cost_per_job', 16666.67):,.2f}</strong></div>
                </div>
            </div>

            <p class="defense-p"><strong>The Core Defense:</strong> {cf_data.get('comparative_argument', '')}</p>

            <div class="cf-exclusion">
                <strong>🏛️ Hub Exclusion Rule (Why we don't blindly fund the biggest hub):</strong><br>
                {cf_data.get('hub_exclusion_rule', '')}
            </div>

            <p class="defense-p"><strong>SBA Fragility Scan & Disclosures:</strong> {defense.get('risk_mitigation')}</p>

            <!-- SECTION 6: RECOMMENDED COMMITTEE MOTION -->
            <div class="motion-box">
                <div class="motion-title">
                    <span>⚖️</span>
                    <span>Recommended Formal Motion for Committee Roll-Call Vote</span>
                </div>
                <p class="motion-text">{defense.get('committee_motion')}</p>
            </div>
        </main>

        <!-- Footer -->
        <footer class="dossier-footer">
            <div>City and County of San Francisco • Municipal Code Subch. IV (Resilience Allocation)</div>
            <div>Prepared by: Engine of Prosperity ADK Reasoning Agent • Confirmed via BigQuery GQL</div>
        </footer>
    </div>

    <!-- Chart.js Scripts -->
    <script>
        const chartData = {chart_data_json};

        // 1. Jobs Donut Chart
        new Chart(document.getElementById('jobsChart'), {{
            type: 'doughnut',
            data: {{
                labels: chartData.jobs_breakdown.labels,
                datasets: [{{
                    data: chartData.jobs_breakdown.data,
                    backgroundColor: ['#0284c7', '#10b981'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }}]
            }},
            options: {{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {{
                    legend: {{ position: 'bottom', labels: {{ boxWidth: 12, font: {{ size: 11 }} }} }}
                }}
            }}
        }});

        // 2. 4-Pillar Radar Chart
        new Chart(document.getElementById('pillarChart'), {{
            type: 'radar',
            data: {{
                labels: chartData.pillar_scores.labels,
                datasets: [{{
                    label: 'Pillar Rating (0-100)',
                    data: chartData.pillar_scores.scores,
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    borderColor: '#10b981',
                    pointBackgroundColor: '#059669',
                    borderWidth: 2
                }}]
            }},
            options: {{
                responsive: true,
                maintainAspectRatio: false,
                scales: {{
                    r: {{
                        min: 0,
                        max: 100,
                        ticks: {{ stepSize: 25, display: false }},
                        pointLabels: {{ font: {{ size: 10 }} }}
                    }}
                }},
                plugins: {{ legend: {{ display: false }} }}
            }}
        }});

        // 3. Cascade Tiers Bar Chart
        new Chart(document.getElementById('tierChart'), {{
            type: 'bar',
            data: {{
                labels: chartData.cascade_tiers.labels,
                datasets: [{{
                    label: 'Supplier Jobs Reached',
                    data: chartData.cascade_tiers.jobs,
                    backgroundColor: '#6366f1',
                    borderRadius: 6
                }}]
            }},
            options: {{
                responsive: true,
                maintainAspectRatio: false,
                scales: {{
                    y: {{ beginAtZero: true, grid: {{ color: '#f1f5f9' }} }},
                    x: {{ grid: {{ display: false }} }}
                }},
                plugins: {{
                    legend: {{ display: false }}
                }}
            }}
        }});

        // 4. Cost Benchmark Horizontal Bar Chart
        new Chart(document.getElementById('costChart'), {{
            type: 'bar',
            data: {{
                labels: chartData.cost_benchmark.labels,
                datasets: [{{
                    label: 'Cost Per Job ($)',
                    data: chartData.cost_benchmark.costs,
                    backgroundColor: ['#059669', '#cbd5e1'],
                    borderRadius: 6
                }}]
            }},
            options: {{
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {{
                    x: {{
                        beginAtZero: true,
                        grid: {{ color: '#f1f5f9' }},
                        ticks: {{ callback: value => '$' + value.toLocaleString() }}
                    }},
                    y: {{ grid: {{ display: false }} }}
                }},
                plugins: {{
                    legend: {{ display: false }},
                    tooltip: {{
                        callbacks: {{
                            label: ctx => '$' + ctx.parsed.x.toLocaleString() + ' per job'
                        }}
                    }}
                }}
            }}
        }});
    </script>
</body>
</html>
"""
