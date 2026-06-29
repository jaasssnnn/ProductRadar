const FACTOR_KEYS = ['inactivity', 'usage_decline', 'billing', 'support', 'renewal_risk', 'low_adoption'];

export const FACTOR_SHORT = {
  inactivity:    'Inactive',
  usage_decline: 'Usage Drop',
  billing:       'Billing Issue',
  support:       'Support Friction',
  renewal_risk:  'Renewal Risk',
  low_adoption:  'Low Adoption',
};

function toVector(account) {
  return FACTOR_KEYS.map(k => (account.factors?.some(f => f.key === k) ? 1 : 0));
}

function euclidean(a, b) {
  return Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));
}

function centroidOf(vectors) {
  if (!vectors.length) return FACTOR_KEYS.map(() => 0);
  return FACTOR_KEYS.map((_, i) => vectors.reduce((s, v) => s + v[i], 0) / vectors.length);
}

// K-means++ initialization for stable seeding
function initCentroids(vectors, k) {
  const centers = [vectors[Math.floor(Math.random() * vectors.length)]];
  while (centers.length < k) {
    const dists = vectors.map(v => Math.min(...centers.map(c => euclidean(v, c))));
    const total = dists.reduce((s, d) => s + d * d, 0);
    let r = Math.random() * total;
    for (let i = 0; i < vectors.length; i++) {
      r -= dists[i] * dists[i];
      if (r <= 0) { centers.push(vectors[i]); break; }
    }
    if (centers.length < k) centers.push(vectors[vectors.length - 1]);
  }
  return centers;
}

function nameCluster(centroid) {
  const dominant = FACTOR_KEYS.filter((_, i) => centroid[i] > 0.5);

  if (dominant.length === 0) return {
    name: 'Healthy Accounts',
    description: 'No significant risk signals — stable, low-churn cohort',
  };
  if (dominant.length >= 4) return {
    name: 'Multi-Signal Risk',
    description: 'Four or more simultaneous risk factors — highest churn probability',
  };

  const names = dominant.map(k => FACTOR_SHORT[k]);
  const combos = {
    'Inactive+Billing Issue':            { name: 'Disengaged & Delinquent',    description: 'Not logging in and payment issues — classic involuntary churn profile' },
    'Inactive+Low Adoption':             { name: 'Never Activated',            description: 'Low engagement from the start — product value not realized' },
    'Usage Drop+Billing Issue':          { name: 'Slipping Away',              description: 'Declining activity combined with payment friction' },
    'Usage Drop+Renewal Risk':           { name: 'Renewal Watch',              description: 'Usage declining heading into renewal — time-sensitive' },
    'Billing Issue+Support Friction':    { name: 'Frustrated & Stuck',         description: 'Payment problems alongside unresolved support — high voluntary churn risk' },
    'Support Friction+Low Adoption':     { name: 'Struggling to Adopt',        description: 'Running into issues and not using features — needs success intervention' },
  };

  const key = names.join('+');
  if (combos[key]) return combos[key];

  return {
    name: names.join(' · '),
    description: `Primarily driven by: ${names.join(', ')}`,
  };
}

export function clusterAccounts(accounts, k) {
  const n = accounts.length;
  if (n < 2) return { clusters: [], assignments: [] };

  // Auto k: roughly 1 cluster per 3 accounts, max 4
  const numClusters = k ?? Math.min(4, Math.max(2, Math.ceil(n / 3)));
  const vectors = accounts.map(toVector);

  let centroids = initCentroids(vectors, numClusters);
  let assignments = new Array(n).fill(0);

  for (let iter = 0; iter < 150; iter++) {
    const next = vectors.map(v =>
      centroids.reduce((best, c, i) =>
        euclidean(v, c) < euclidean(v, centroids[best]) ? i : best, 0)
    );
    const converged = next.every((a, i) => a === assignments[i]);
    assignments = next;
    if (converged) break;
    for (let i = 0; i < numClusters; i++) {
      const group = vectors.filter((_, j) => assignments[j] === i);
      if (group.length) centroids[i] = centroidOf(group);
    }
  }

  // Remove empty clusters, sort by avg score desc
  const clusters = Array.from({ length: numClusters }, (_, i) => {
    const members = accounts.filter((_, j) => assignments[j] === i);
    if (!members.length) return null;
    const avgScore = Math.round(members.reduce((s, a) => s + a.score, 0) / members.length);
    const { name, description } = nameCluster(centroids[i]);
    return {
      id: i,
      name,
      description,
      members,
      centroid: centroids[i],
      avgScore,
      dominantFactors: FACTOR_KEYS.filter((_, fi) => centroids[i][fi] > 0.5),
    };
  })
    .filter(Boolean)
    .sort((a, b) => b.avgScore - a.avgScore);

  return { clusters };
}
