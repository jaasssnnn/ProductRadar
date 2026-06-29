'use client';
import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { createClient } from '../lib/supabase/client';
import { computeLearnedWeights } from '../lib/scoring';
import { clusterAccounts } from '../lib/clustering';

const AppContext = createContext(null);

const BAND_ORDER = { Low: 1, Medium: 2, High: 3, Critical: 4 };

function categorize(curr, prev) {
  const currBand = BAND_ORDER[curr.label] || 0;
  const prevBand = BAND_ORDER[prev.label] || 0;
  const delta = curr.score - prev.score;
  const prevKeys = new Set(prev.factorKeys || []);
  const currKeys = curr.factors?.map(f => f.key) || [];
  const newFactors = currKeys.filter(k => !prevKeys.has(k));

  if (currBand > prevBand) return { type: 'escalated',  delta, newFactors };
  if (currBand < prevBand) return { type: 'improved',   delta, newFactors };
  if (delta >= 10)         return { type: 'rose',       delta, newFactors };
  if (delta <= -10)        return { type: 'fell',       delta, newFactors };
  if (newFactors.length)   return { type: 'new_factor', delta, newFactors };
  return                          { type: 'unchanged',  delta, newFactors };
}

async function upsertAccountState(customerId, patch) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('account_states').upsert(
    { user_id: user.id, customer_id: customerId, ...patch, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,customer_id' }
  );
}

async function saveSnapshotToDB(snapshot) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('snapshots').upsert(
    { user_id: user.id, data: snapshot, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );
}

function lsGet(key) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* storage full or unavailable */ }
}
function lsClear(...keys) {
  try { keys.forEach(k => localStorage.removeItem(k)); } catch (e) { /* unavailable */ }
}

export function AppProvider({ children }) {
  const [customers, _setCustomers] = useState([]);
  const [activity,  _setActivity]  = useState([]);
  const [billing,   _setBilling]   = useState([]);
  const [support,   _setSupport]   = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [accountStatuses, setAccountStatuses] = useState({});
  const [notes,    setNotes]    = useState({});
  const [outcomes, setOutcomes] = useState({});
  const [owners,   setOwners]   = useState({});
  const [dueDates, setDueDates] = useState({});
  const [scoredAccounts, _setScoredAccounts] = useState([]);
  const [previousSnapshot, setPreviousSnapshot] = useState(null);
  const [lastSynced, setLastSynced] = useState(() => lsGet('cr_last_synced'));

  // Hydrate session data from localStorage on first mount
  useEffect(() => {
    const scored = lsGet('cr_scored');
    const custs  = lsGet('cr_customers');
    const acts   = lsGet('cr_activity');
    const bills  = lsGet('cr_billing');
    const sups   = lsGet('cr_support');
    if (scored?.length) {
      _setScoredAccounts(scored);
      if (custs)  _setCustomers(custs);
      if (acts)   _setActivity(acts);
      if (bills)  _setBilling(bills);
      if (sups)   _setSupport(sups);
      setDataLoaded(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setCustomers(v) { _setCustomers(v); lsSet('cr_customers', v); }
  function setActivity(v)  { _setActivity(v);  lsSet('cr_activity',  v); }
  function setBilling(v)   { _setBilling(v);   lsSet('cr_billing',   v); }
  function setSupport(v)   { _setSupport(v);   lsSet('cr_support',   v); }

  // Load persisted state from Supabase when the user signs in
  useEffect(() => {
    const supabase = createClient();

    async function loadUserData(userId) {
      const [{ data: states }, { data: snap }] = await Promise.all([
        supabase.from('account_states').select('*').eq('user_id', userId),
        supabase.from('snapshots').select('data').eq('user_id', userId).maybeSingle(),
      ]);

      if (states?.length) {
        const statusMap = {}, notesMap = {}, outcomesMap = {}, ownersMap = {}, dueDatesMap = {};
        states.forEach(s => {
          if (s.status)   statusMap[s.customer_id]    = s.status;
          if (s.notes)    notesMap[s.customer_id]     = s.notes;
          if (s.outcome)  outcomesMap[s.customer_id]  = s.outcome;
          if (s.owner)    ownersMap[s.customer_id]    = s.owner;
          if (s.due_date) dueDatesMap[s.customer_id]  = s.due_date;
        });
        setAccountStatuses(statusMap);
        setNotes(notesMap);
        setOutcomes(outcomesMap);
        setOwners(ownersMap);
        setDueDates(dueDatesMap);
      }

      if (snap?.data) setPreviousSnapshot(snap.data);
    }

    // Load immediately if already signed in
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) loadUserData(user.id);
    });

    // Re-load on auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) loadUserData(session.user.id);
      if (event === 'SIGNED_OUT') {
        setAccountStatuses({});
        setNotes({});
        setOutcomes({});
        setOwners({});
        setDueDates({});
        setPreviousSnapshot(null);
        _setScoredAccounts([]);
        _setCustomers([]);
        _setActivity([]);
        _setBilling([]);
        _setSupport([]);
        setDataLoaded(false);
        lsClear('cr_scored', 'cr_customers', 'cr_activity', 'cr_billing', 'cr_support');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  function setScoredAccounts(newScores) {
    if (scoredAccounts.length > 0) {
      const snapshot = {
        timestamp: new Date().toISOString(),
        accounts: scoredAccounts.map(a => ({
          customer_id:  a.customer_id,
          account_name: a.account_name,
          score:        a.score,
          label:        a.label,
          factorKeys:   a.factors?.map(f => f.key) || [],
        })),
      };
      setPreviousSnapshot(snapshot);
      saveSnapshotToDB(snapshot);
    }
    _setScoredAccounts(newScores);
    lsSet('cr_scored', newScores);
    const ts = new Date().toISOString();
    setLastSynced(ts);
    lsSet('cr_last_synced', ts);
  }

  const learnedWeightResult = useMemo(
    () => computeLearnedWeights(scoredAccounts, accountStatuses, outcomes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scoredAccounts, accountStatuses, outcomes]
  );

  const clusters = useMemo(
    () => scoredAccounts.length >= 2 ? clusterAccounts(scoredAccounts).clusters : [],
    [scoredAccounts]
  );

  const loadedDataTypes = [
    customers.length > 0 ? 'customers' : null,
    activity.length  > 0 ? 'activity'  : null,
    billing.length   > 0 ? 'billing'   : null,
    support.length   > 0 ? 'support'   : null,
  ].filter(Boolean);

  const accountChanges = previousSnapshot
    ? scoredAccounts
        .map(curr => {
          const prev = previousSnapshot.accounts.find(p => p.customer_id === curr.customer_id);
          if (!prev) return null;
          const change = categorize(curr, prev);
          return { ...curr, ...change, prevLabel: prev.label, prevScore: prev.score };
        })
        .filter(Boolean)
        .filter(a => a.type !== 'unchanged')
        .sort((a, b) => {
          const priority = { escalated: 0, rose: 1, new_factor: 2, improved: 3, fell: 4 };
          return (priority[a.type] ?? 9) - (priority[b.type] ?? 9);
        })
    : [];

  const escalatedCount  = accountChanges.filter(a => a.type === 'escalated').length;
  const changedAccounts = accountChanges.filter(a => a.type === 'escalated' || a.type === 'improved');

  function updateStatus(id, s) {
    setAccountStatuses(p => ({ ...p, [id]: s }));
    upsertAccountState(id, { status: s });
  }
  function updateNote(id, v) {
    setNotes(p => ({ ...p, [id]: v }));
    upsertAccountState(id, { notes: v || null });
  }
  function updateOutcome(id, v) {
    setOutcomes(p => ({ ...p, [id]: v }));
    upsertAccountState(id, { outcome: v || null });
  }
  function updateOwner(id, v) {
    setOwners(p => ({ ...p, [id]: v }));
    upsertAccountState(id, { owner: v || null });
  }
  function updateDueDate(id, v) {
    setDueDates(p => ({ ...p, [id]: v }));
    upsertAccountState(id, { due_date: v || null });
  }

  return (
    <AppContext.Provider value={{
      customers, setCustomers,
      activity,  setActivity,
      billing,   setBilling,
      support,   setSupport,
      scoredAccounts, setScoredAccounts,
      dataLoaded, setDataLoaded,
      accountStatuses, updateStatus,
      notes, updateNote,
      outcomes, updateOutcome,
      owners, updateOwner,
      dueDates, updateDueDate,
      loadedDataTypes,
      previousSnapshot,
      lastSynced,
      accountChanges,
      changedAccounts,
      escalatedCount,
      learnedWeights: learnedWeightResult.weights,
      learnedWeightsMeta: {
        sampleSize: learnedWeightResult.sampleSize,
        isLearned:  learnedWeightResult.isLearned,
      },
      clusters,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() { return useContext(AppContext); }
