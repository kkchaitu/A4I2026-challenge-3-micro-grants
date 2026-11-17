import React from 'react';
import { ShieldCheck, Users, Landmark, HeartHandshake, AlertCircle, Sparkles } from 'lucide-react';

export function EquityDemographics({ corridor }) {
  const d = corridor.demographics;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">
              Neighborhood Demographic Profile & Equity Compliance
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Auditing Where the Relief Money Lands: U.S. Census Tract Demographics & HUD Standards
            </p>
          </div>
        </div>
      </div>

      {/* Main Demographics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Poverty */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs text-slate-400 block mb-1">TRACT POVERTY RATE</span>
          <div className="text-2xl font-bold font-mono text-rose-400">{d.pctPoverty}</div>
          <div className="text-[11px] text-slate-500 mt-2 font-mono">
            Citywide avg: 10.3%
          </div>
        </div>

        {/* BIPOC */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs text-slate-400 block mb-1">BIPOC POPULATION</span>
          <div className="text-2xl font-bold font-mono text-blue-400">{d.pctBIPOC}</div>
          <div className="text-[11px] text-slate-500 mt-2 font-mono">
            Majority-minority tract
          </div>
        </div>

        {/* Median Income */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs text-slate-400 block mb-1">MEDIAN HOUSEHOLD INCOME</span>
          <div className="text-2xl font-bold font-mono text-slate-100">{d.medianHouseholdIncome}</div>
          <div className="text-[11px] text-slate-500 mt-2 font-mono">
            {d.areaMedianIncomePct} of Area Median Income (AMI)
          </div>
        </div>

        {/* HUD Zone */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs text-slate-400 block mb-1">FEDERAL DESIGNATION</span>
          <div className="text-sm font-bold text-emerald-400 leading-snug">{d.hudZone}</div>
          <div className="text-[11px] text-slate-500 mt-2 font-mono">
            HUD Section 8 / CDBG Eligible
          </div>
        </div>
      </div>

      {/* Detailed Analysis Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Landmark className="w-4 h-4 text-blue-400" />
            <span>Why Neighborhood Grounding Matters</span>
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            In small-business relief programs, a common defect is allocating capital to businesses located in gentrified or high-wealth pockets that already possess robust banking relationships and capital buffers.
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Our pipeline explicitly ties every business node to its Census Tract (<strong>{d.tractName}</strong>). By verifying that {corridor.name} sits within an Area Median Income zone of <strong>{d.areaMedianIncomePct}</strong>, we ensure public relief capital targets historically undercapitalized corridors with acute displacement pressures.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-emerald-400" />
            <span>Equity Audit: Guarding Against Hub Monopolization</span>
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            A key trap identified in Section 13 of the challenge is that an unconstrained graph model can blindly favor giant corporate distributors because of pure degree centrality.
          </p>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1.5">
            <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Section 13 Filtering Applied:</span>
            </div>
            <p className="text-[11px] text-slate-400">
              We apply an upper bound filter (<code>exposed_2hop &lt;= 25</code>) to eliminate corporate monopolies, directing grants to the vibrant middle tier of local independent bakeries, hardware suppliers, and commissary prep kitchens that form the true economic spine of the neighborhood.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
