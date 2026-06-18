import Papa from 'papaparse';

export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: results => resolve(results.data),
      error: err => reject(err),
    });
  });
}

export function normalizeHeaders(rows) {
  return rows.map(row => {
    const clean = {};
    for (const key in row) {
      clean[key.toLowerCase().trim().replace(/\s+/g, '_')] = row[key];
    }
    return clean;
  });
}

// Detect what kind of data a CSV contains based on its column names
export function detectFileType(rows) {
  if (!rows || rows.length === 0) return 'unknown';
  const headers = Object.keys(rows[0]).map(k => k.toLowerCase());
  if (headers.some(h => ['account_name', 'mrr', 'renewal_date', 'signup_date'].includes(h))) return 'customers';
  if (headers.some(h => ['event_name', 'feature_use'].includes(h)) || (headers.includes('timestamp') && headers.includes('count'))) return 'activity';
  if (headers.some(h => ['invoice_status', 'failed_payments', 'subscription_status'].includes(h))) return 'billing';
  if (headers.some(h => ['ticket_count', 'unresolved_tickets', 'sentiment_tag'].includes(h))) return 'support';
  return 'unknown';
}

export async function fetchSampleCSV(filename) {
  const response = await fetch(`/sample-data/${filename}`);
  if (!response.ok) throw new Error(`Failed to fetch ${filename}`);
  const text = await response.text();
  const result = Papa.parse(text, { header: true, skipEmptyLines: true });
  return normalizeHeaders(result.data);
}
