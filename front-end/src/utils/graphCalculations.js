// Graph traversal, cascade risk propagation, and allocation strategies

export function calculateDownstreamExposure(seedId, corridor, maxDepth = 2) {
  const { businesses, edges } = corridor;
  const businessMap = new Map(businesses.map(b => [b.id, b]));
  
  const visited = new Set();
  const queue = [{ id: seedId, depth: 0, path: [seedId], cumulativeIntensity: 1.0 }];
  const paths = [];
  const reachedBusinesses = new Map(); // id -> { business, minDepth, maxIntensity, path }

  while (queue.length > 0) {
    const { id, depth, path, cumulativeIntensity } = queue.shift();

    if (depth > 0) {
      if (!reachedBusinesses.has(id) || reachedBusinesses.get(id).minDepth > depth) {
        reachedBusinesses.set(id, {
          business: businessMap.get(id),
          minDepth: depth,
          cumulativeIntensity,
          path,
        });
      }
    }

    if (depth >= maxDepth) continue;

    // Outgoing supply edges (supplier -> buyer)
    const outgoing = edges.filter(e => e.type === 'Supplies' && e.source === id);
    for (const edge of outgoing) {
      const nextId = edge.target;
      const nextIntensity = cumulativeIntensity * (edge.intensity || 0.5);
      
      paths.push({
        sourceId: id,
        targetId: nextId,
        sourceName: businessMap.get(id)?.name || id,
        targetName: businessMap.get(nextId)?.name || nextId,
        depth: depth + 1,
        edgeLabel: edge.label,
        intensity: edge.intensity,
        metres: edge.metres,
      });

      queue.push({
        id: nextId,
        depth: depth + 1,
        path: [...path, nextId],
        cumulativeIntensity: nextIntensity,
      });
    }
  }

  const downstreamList = Array.from(reachedBusinesses.values());
  const directDependents = downstreamList.filter(d => d.minDepth === 1);
  const twoHopDependents = downstreamList.filter(d => d.minDepth === 2);
  const totalDownstreamJobs = downstreamList.reduce((acc, d) => acc + (d.business?.jobs || 0), 0);

  return {
    seed: businessMap.get(seedId),
    reachedCount: downstreamList.length,
    directCount: directDependents.length,
    twoHopCount: twoHopDependents.length,
    totalDownstreamJobs,
    downstreamList,
    paths,
  };
}

// Compute Naive Strategy: Sort by distress score descending
export function runNaiveStrategy(corridor, budget) {
  const sorted = [...corridor.businesses].sort((a, b) => b.distressScore - a.distressScore);
  const funded = [];
  let remainingBudget = budget;

  for (const b of sorted) {
    if (b.grantRequested <= remainingBudget) {
      funded.push(b);
      remainingBudget -= b.grantRequested;
    }
  }

  const directJobs = funded.reduce((acc, b) => acc + b.jobs, 0);
  // Calculate true downstream cascade protected
  let totalCascadeJobs = 0;
  let totalDownstreamBusinesses = new Set();

  funded.forEach(b => {
    const exposure = calculateDownstreamExposure(b.id, corridor, 2);
    exposure.downstreamList.forEach(d => totalDownstreamBusinesses.add(d.business.id));
    totalCascadeJobs += exposure.totalDownstreamJobs;
  });

  return {
    name: 'Naive Rank-by-Distress (Section 2 Anti-Pattern)',
    funded,
    remainingBudget,
    directJobs,
    cascadeJobs: totalCascadeJobs,
    downstreamBusinessesCount: totalDownstreamBusinesses.size,
    totalJobsProtected: directJobs + totalCascadeJobs,
    ratio: ((directJobs + totalCascadeJobs) / (budget - remainingBudget || 1)).toFixed(3),
    critique: 'Funds high-distress leaf nodes (dry cleaners, bookstores, florists). Leaves 0 downstream impact and ignores vital local supply chain keystones.',
  };
}

// Compute Graph Cascade Aware Strategy: Multi-hop ripple impact per grant dollar
export function runResilienceStrategy(corridor, budget) {
  // Score = (direct_jobs + (1-hop_jobs * 0.75) + (2-hop_jobs * 0.45)) * distress / (grant / 10000)
  const scored = corridor.businesses.map(b => {
    const exposure = calculateDownstreamExposure(b.id, corridor, 2);
    const downstreamJobs = exposure.totalDownstreamJobs;
    const directJobs = b.jobs;
    const systemicValue = (directJobs * 1.0) + (downstreamJobs * 0.85);
    const score = (systemicValue * b.distressScore) / (b.grantRequested / 10000);
    return {
      ...b,
      exposure,
      calculatedScore: score,
    };
  }).sort((a, b) => b.calculatedScore - a.calculatedScore);

  const funded = [];
  let remainingBudget = budget;

  for (const b of scored) {
    if (b.grantRequested <= remainingBudget) {
      funded.push(b);
      remainingBudget -= b.grantRequested;
    }
  }

  const directJobs = funded.reduce((acc, b) => acc + b.jobs, 0);
  let totalCascadeJobs = 0;
  let totalDownstreamBusinesses = new Set();

  funded.forEach(b => {
    const exposure = calculateDownstreamExposure(b.id, corridor, 2);
    exposure.downstreamList.forEach(d => totalDownstreamBusinesses.add(d.business.id));
    totalCascadeJobs += exposure.totalDownstreamJobs;
  });

  return {
    name: 'Graph Cascade Resilience Strategy (Multi-Hop Protected)',
    funded,
    remainingBudget,
    directJobs,
    cascadeJobs: totalCascadeJobs,
    downstreamBusinessesCount: totalDownstreamBusinesses.size,
    totalJobsProtected: directJobs + totalCascadeJobs,
    ratio: ((directJobs + totalCascadeJobs) / (budget - remainingBudget || 1)).toFixed(3),
    critique: 'Directly secures critical wholesale hubs, commissaries, and commercial hardware providers. Prevents multi-hop closure cascades across the entire corridor.',
  };
}
