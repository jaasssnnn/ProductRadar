// Next.js: client-accessible env vars must be prefixed NEXT_PUBLIC_
// Falls back to the legacy VITE_ name so existing .env files keep working.
const API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY || process.env.NEXT_PUBLIC_VITE_GROQ_API_KEY;
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_AI === 'true' || !API_KEY;

async function callGroq(prompt) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.4,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(`Groq API error ${response.status}: ${errBody?.error?.message || 'unknown'}`);
  }
  const data = await response.json();
  return data.choices[0].message.content;
}

const MOCK_RECOMMENDATION = {
  summary:
    'This account shows multiple compounding risk signals: prolonged inactivity, billing friction, and unresolved support issues. Without intervention, renewal is unlikely.',
  whyNow:
    'The combination of lapsed engagement and payment failures creates immediate churn risk.',
  recommendation:
    'Schedule an urgent check-in call. Lead with value delivered, address the billing issue, and offer a success plan walkthrough.',
  outreachEmail:
    'Subject: Quick check-in — let\'s make sure you\'re getting value\n\nHi [Name],\n\nI noticed it\'s been a while since your team has been active in the platform. I wanted to reach out personally to make sure everything is going smoothly and that you\'re getting the most out of your subscription.\n\nWould you have 20 minutes this week for a quick call? I\'d love to show you a few features that teams like yours have found really valuable.\n\nLet me know what works for you.\n\nBest,\n[Account Manager]',
  outreachWhatsApp:
    'Hi [Name], this is [AM] from ProductRadar. I noticed your team hasn\'t logged in recently and wanted to check in. Are you running into any issues? Happy to jump on a quick call this week to help.',
};

const MOCK_INSIGHTS = [
  {
    title: 'Billing failures cluster in Starter plans',
    description:
      'Over 60% of accounts with payment failures are on the Starter tier. This suggests price sensitivity or poor onboarding-to-value realization.',
    action: 'Create a targeted success motion for Starter accounts at the 60-day mark.',
    severity: 'high',
  },
  {
    title: 'Inactivity precedes churn by 30–45 days',
    description:
      'Accounts that go quiet for 2+ weeks almost always show billing issues within the next month. Activity drop is the earliest leading indicator.',
    action: 'Trigger an automated nudge sequence when logins drop below 2 per week.',
    severity: 'high',
  },
  {
    title: 'Support friction is correlated with negative renewal outcomes',
    description:
      'Accounts with 3+ unresolved tickets and negative sentiment have a near-zero renewal rate in similar datasets.',
    action: 'Escalate any account with 3+ open tickets to senior CSM within 48 hours.',
    severity: 'medium',
  },
];

export async function getAccountRecommendation(account, scoreResult) {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 1200));
    return MOCK_RECOMMENDATION;
  }

  const { score, label, factors, daysSinceActivity, usageDropPercent } = scoreResult;
  const factorText = factors.map(f => `- ${f.label}: ${f.detail}`).join('\n');

  const prompt = `You are a customer success advisor for a SaaS company. Here is data on a customer account:

Account: ${account.account_name}
Plan: ${account.plan}
MRR: $${account.mrr}
Renewal Date: ${account.renewal_date}
Churn Risk Score: ${score}/100 (${label})

Risk Factors Detected:
${factorText || 'No specific risk factors detected.'}

Days Since Last Activity: ${daysSinceActivity}
Usage Drop vs Prior 2 Weeks: ${usageDropPercent}%

Please respond with ONLY a JSON object (no markdown, no preamble) in this exact format:
{
  "summary": "2-3 sentence plain-language explanation of why this account is at risk",
  "whyNow": "One sentence explaining the urgency (e.g. renewal timing, recent drop)",
  "recommendation": "Specific recommended next action",
  "outreachEmail": "A short, personalized outreach email (subject + body) for the account manager to send",
  "outreachWhatsApp": "A short WhatsApp/SMS message version (2-3 sentences, casual but professional)"
}`;

  const text = await callGroq(prompt);
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
    return {
      summary: text,
      whyNow: '',
      recommendation: 'Review account manually.',
      outreachEmail: '',
      outreachWhatsApp: '',
    };
  }
}

export async function getInsightsSummary(accountsWithScores) {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 1500));
    return MOCK_INSIGHTS;
  }

  const highRisk = accountsWithScores.filter(a => a.score >= 50);
  const criticalCount = accountsWithScores.filter(a => a.label === 'Critical').length;
  const totalMRRAtRisk = highRisk.reduce((sum, a) => sum + parseFloat(a.mrr || 0), 0);

  const prompt = `You are a SaaS retention analyst. Analyze these high-risk customer accounts and identify 3 key patterns:

Total Accounts: ${accountsWithScores.length}
High/Critical Risk: ${highRisk.length}
Critical Count: ${criticalCount}
MRR At Risk: $${totalMRRAtRisk}

Top Risk Factors across accounts:
${highRisk.slice(0, 5).map(a =>
  `- ${a.account_name} (${a.label}): ${(a.factors || []).map(f => f.label).join(', ')}`
).join('\n')}

Respond ONLY with a JSON array of 3 insight objects (no markdown):
[
  {
    "title": "Short insight title",
    "description": "2-sentence description of the pattern and what it means",
    "action": "What the team should do about it",
    "severity": "high | medium | low"
  }
]`;

  const text = await callGroq(prompt);
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
    return MOCK_INSIGHTS;
  }
}
