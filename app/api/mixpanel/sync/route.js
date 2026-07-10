import { NextResponse } from 'next/server';

// Mixpanel Data Export API — server-side only (credentials never stored)
// Docs: https://developer.mixpanel.com/reference/raw-event-export

export async function POST(request) {
  try {
    const { projectToken, apiSecret, fromDate, toDate } = await request.json();

    if (!apiSecret) return NextResponse.json({ error: 'API secret is required.' }, { status: 400 });
    if (!fromDate || !toDate) return NextResponse.json({ error: 'Date range is required.' }, { status: 400 });

    // Basic auth: apiSecret as username, empty password
    const credentials = Buffer.from(`${apiSecret}:`).toString('base64');

    const params = new URLSearchParams({ from_date: fromDate, to_date: toDate });
    const url = `https://data.mixpanel.com/api/2.0/export/?${params}`;

    const mpRes = await fetch(url, {
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: 'text/plain',
      },
    });

    if (!mpRes.ok) {
      const errText = await mpRes.text().catch(() => '');
      if (mpRes.status === 401) return NextResponse.json({ error: 'Invalid API secret — check your Mixpanel project credentials.' }, { status: 401 });
      if (mpRes.status === 400) return NextResponse.json({ error: 'Invalid request — check your date range format (YYYY-MM-DD).' }, { status: 400 });
      return NextResponse.json({ error: `Mixpanel error ${mpRes.status}: ${errText.slice(0, 200)}` }, { status: 502 });
    }

    // Response is NDJSON — one JSON object per line
    const text = await mpRes.text();
    const lines = text.split('\n').filter(l => l.trim());

    if (lines.length === 0) {
      return NextResponse.json({ activity: [], meta: { eventCount: 0, fromDate, toDate } });
    }

    // Parse each line and map to activity CSV shape
    // Aggregate: group by customer_id + event_name + date, count occurrences
    const tally = {};

    for (const line of lines) {
      let event;
      try { event = JSON.parse(line); } catch { continue; }

      const props = event.properties || {};
      const customerId = String(props.$user_id || props.distinct_id || '').trim();
      if (!customerId) continue;

      const eventName = String(event.event || 'unknown').trim();
      const timestamp = props.time
        ? new Date(props.time * 1000).toISOString().split('T')[0]
        : fromDate;

      const key = `${customerId}||${eventName}||${timestamp}`;
      tally[key] = (tally[key] || 0) + 1;
    }

    // Convert tally to activity rows
    const activity = Object.entries(tally).map(([key, count]) => {
      const [customer_id, event_name, timestamp] = key.split('||');
      return { customer_id, event_name, timestamp, count };
    });

    return NextResponse.json({
      activity,
      meta: {
        eventCount: lines.length,
        rowCount: activity.length,
        fromDate,
        toDate,
        projectToken: projectToken || null,
      },
    });
  } catch (err) {
    console.error('Mixpanel sync error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
