# Deep Dive Gap Analysis Report

## Executive Summary

Comprehensive analysis using Ralph Loop, Debug Skill, Review Skill, and Explore Agents identified **47 gaps** across the NexaraVision incident creation system.

| Category | Count | Severity |
|----------|-------|----------|
| Security (RLS Policies) | 8 | CRITICAL |
| Error Handling | 26 | HIGH |
| Code Quality | 7 | MEDIUM |
| Performance | 4 | LOW |
| Documentation | 2 | LOW |

---

## 1. SECURITY GAPS (RLS Policies)

### GAP-SEC-001: escalation_rules Table Locked (CRITICAL)
- **File:** `supabase/schema.sql` (lines 214-219)
- **Issue:** RLS enabled but ZERO policies = table completely inaccessible
- **Impact:** Incident escalation feature broken, silent failures
- **Fix Required:**
```sql
CREATE POLICY "Authenticated users can view escalation rules"
    ON escalation_rules FOR SELECT
    USING (auth.role() = 'authenticated');
```

### GAP-SEC-002: Alerts Table Overly Permissive (CRITICAL)
- **File:** `supabase/schema.sql` (line 256)
- **Issue:** `FOR ALL USING (true)` allows anyone to delete all alerts
- **Impact:** Any user can delete security audit trail
- **Fix Required:** Restrict to user ownership or admin role

### GAP-SEC-003: Missing DELETE Policies (HIGH)
- **Tables Affected:** profiles, incidents, cameras, locations, daily_analytics
- **Issue:** DELETE operations silently fail (return count:0, error:null)
- **Impact:** Cleanup operations fail without user notification

### GAP-SEC-004: Incidents INSERT Policy Conflict (MEDIUM)
- **Files:** schema.sql vs. migrations/20260121_fix_rls_policies.sql
- **Issue:** Duplicate policy definitions may cause unpredictable behavior
- **Fix Required:** Consolidate policies, run migrations in order

### GAP-SEC-005: Storage Policies Disabled (MEDIUM)
- **File:** `migrations/20260121_fix_rls_policies.sql` (lines 47-63)
- **Issue:** Video/thumbnail upload policies are commented out
- **Impact:** Recording storage feature non-functional

### GAP-SEC-006: No INSERT Policy for profiles (LOW)
- **Issue:** New user profile creation may fail silently
- **Impact:** User registration issues

### GAP-SEC-007: daily_analytics Missing Write Policies (LOW)
- **Issue:** Only SELECT policy exists
- **Impact:** Analytics data cannot be written

### GAP-SEC-008: Authentication Pattern Inconsistency (LOW)
- **Issue:** Mix of `auth.role()`, `auth.uid()`, and subquery patterns
- **Impact:** Maintenance difficulty, potential bypass routes

---

## 2. ERROR HANDLING GAPS

### GAP-ERR-001 to GAP-ERR-007: Silent Failures (Empty Catch Blocks)

| File | Line | Issue |
|------|------|-------|
| `LiveCamera.tsx` | 422 | Empty catch in pose detection |
| `LiveCamera.tsx` | 689 | Empty catch for WebSocket connection |
| `LiveCamera.tsx` | 776 | `audio.play().catch(() => {})` |
| `page.tsx` (dashboard) | 32, 59 | `try { ws.close(); } catch {}` |
| `FileUpload.tsx` | 155 | No null check on blob creation |
| `MultiCameraGrid.tsx` | 382 | Empty catch in detection promise |

### GAP-ERR-008 to GAP-ERR-012: WebSocket Error Handling

| Location | Issue |
|----------|-------|
| `websocket.ts:132` | Error object not logged with details |
| `websocket.ts:147` | No distinction between network vs protocol errors |
| `websocket.ts:221` | Max reconnect failure not surfaced to UI |
| `live/page.tsx:569` | WebSocket error only logged, not propagated |
| `live/page.tsx:548-550` | Malformed JSON silently logged |

### GAP-ERR-013 to GAP-ERR-016: Unhandled Promise Rejections

| File | Line | Issue |
|------|------|-------|
| `LiveCamera.tsx` | 207 | `await loadPoseModel()` - generic error handling |
| `LiveCamera.tsx` | 688 | Generic error message for connection failures |
| `MultiCameraGrid.tsx` | 388 | `Promise.all` - no error aggregation |
| `live/page.tsx` | 1166 | Connection result not validated before use |

### GAP-ERR-017 to GAP-ERR-022: Async Operations Without Error Boundaries

| File | Location | Issue |
|------|----------|-------|
| `live/page.tsx` | 697 | `getOrCreateDefaultLocation()` error not validated |
| `live/page.tsx` | 710 | `findOrCreateCamera()` error not validated |
| `live/page.tsx` | 750-754 | File upload missing specific error types |
| `api.ts` | 177-189 | Streaming parser has bare try-catch |
| `api.ts` | 196-198 | Promise chain without error transformation |
| `useDetectionHistory.ts` | 59-65, 73 | localStorage operations can throw |

### GAP-ERR-023 to GAP-ERR-026: Incident Recording Failures

| Location | Issue |
|----------|-------|
| `live/page.tsx:740-745` | Error logged but user not notified |
| `live/page.tsx:800` | Recording timeout without error logging |
| `useSupabase.ts:160-180` | Storage errors swallowed |
| Incident creation | No retry mechanism for failed creations |

---

## 3. CODE QUALITY GAPS

### GAP-CQ-001: useSupabase.ts Module-Level Client (src/hooks/useSupabase.ts:7)
```typescript
// Current (problematic for testing/SSR)
const supabase = getSupabase();

// Recommended: Move to function scope or use context
```

### GAP-CQ-002: Any Types Overuse
- **Files:** useSupabase.ts (lines 11, 69, 140, 254, 368, 394-395, 405-406, 415-416)
- **Issue:** `any` type used extensively instead of proper interfaces
- **Impact:** Loss of type safety, harder to catch bugs

### GAP-CQ-003: Magic Numbers (live/page.tsx)
```typescript
const shouldCreateNewIncident = timeSinceLastIncident > 10000; // 10 seconds
```
- Should be a named constant: `const INCIDENT_THROTTLE_MS = 10000;`

### GAP-CQ-004: Missing Input Validation (useSupabase.ts:274-294)
- `createIncident()` doesn't validate UUID format for camera_id/location_id
- No validation for confidence range (0-100)

### GAP-CQ-005: Race Condition in Camera Update (useSupabase.ts:421-424)
```typescript
// Updates status but doesn't await or check error
await supabase.from('cameras').update({ status: 'online' }).eq('id', existing.id);
return { camera: { ...existing, status: 'online' }, error: null };
```

### GAP-CQ-006: Memory Leak Potential (live/page.tsx)
- Multiple refs and timeouts without complete cleanup in useEffect
- AudioContext created on each alert without cleanup

### GAP-CQ-007: Circular Reference Risk (useSupabase.ts)
- Functions call each other without proper error propagation boundaries

---

## 4. PERFORMANCE GAPS

### GAP-PERF-001: N+1 Query Pattern (useDashboardStats)
- 6 separate queries to database in Promise.all
- Could be reduced with database-level aggregation

### GAP-PERF-002: No Query Caching
- useIncidents, useCameras refetch on every component mount
- No SWR, React Query, or manual caching

### GAP-PERF-003: Frame Encoding on Main Thread (live/page.tsx:765)
```typescript
const frameData = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
```
- Blocks main thread during encoding
- Should use OffscreenCanvas or Web Worker

### GAP-PERF-004: No Pagination in useIncidents
- Fetches 50 items every time regardless of need
- No infinite scroll or pagination support

---

## 5. DOCUMENTATION GAPS

### GAP-DOC-001: Missing JSDoc Comments
- Critical functions like `createIncidentWithRecording`, `triggerFightAlert` lack documentation
- No parameter descriptions or return type documentation

### GAP-DOC-002: No Error Code Documentation
- Supabase error codes not documented
- No reference for what each error.code means

---

## 6. INCIDENT CREATION SPECIFIC GAPS

### GAP-INC-001: Stale Closure Bug (RESOLVED)
- **Status:** FIXED in previous iterations
- **Solution:** Using refs (`activeCameraRef`, `defaultLocationRef`)

### GAP-INC-002: Video Storage Disabled
- **File:** useSupabase.ts:308-309
- **Issue:** Storage uploads commented out due to AbortError
- **Impact:** Incidents created but videos not stored

### GAP-INC-003: No Transaction Support
- Camera/location creation and incident creation are separate operations
- If incident fails after camera created, state is inconsistent

### GAP-INC-004: Duplicate Incident Risk
- 10-second throttle can still allow rapid duplicate incidents
- No database-level unique constraint on recent incidents

### GAP-INC-005: Orphaned Incidents
- Foreign keys use ON DELETE SET NULL
- Deleting camera/location orphans the incident record

---

## 7. RECOMMENDED FIXES (Priority Order)

### CRITICAL (Fix Immediately)

1. **Add RLS policies to escalation_rules table**
2. **Restrict alerts table permissions**
3. **Add DELETE policies to all tables**
4. **Fix authentication error propagation**

### HIGH (Fix Before Production)

5. Add error boundaries for incident creation
6. Implement retry mechanism for failed incidents
7. Surface WebSocket errors to UI
8. Add proper error logging (not just console)
9. Validate inputs in createIncident functions
10. Handle RLS silent failures (check count, not just error)

### MEDIUM (Technical Debt)

11. Replace `any` types with proper interfaces
12. Add JSDoc documentation
13. Implement query caching
14. Extract magic numbers to constants
15. Add transaction support for incident creation

### LOW (Nice to Have)

16. Move frame encoding to Web Worker
17. Add pagination to incident queries
18. Implement proper cleanup in useEffects
19. Add comprehensive error code documentation

---

## 8. VERIFICATION STEPS COMPLETED

| Test | Tool | Result |
|------|------|--------|
| Database Tests | Debug Page | 9/9 Pass |
| Incident Creation | Playwright | Working |
| Dashboard Display | Playwright | Shows 2 incidents |
| Console Logging | Browser | `[Incident] Created successfully` |
| RLS Policies | Explore Agent | 8 gaps identified |
| Error Handling | Explore Agent | 26 gaps identified |
| Code Review | Review Skill | 7 quality issues |

---

## 9. FILES ANALYZED

| File | Purpose | Gaps Found |
|------|---------|------------|
| `src/app/live/page.tsx` | Main detection page | 12 |
| `src/hooks/useSupabase.ts` | Database operations | 9 |
| `src/lib/websocket.ts` | WebSocket client | 5 |
| `src/app/live/components/*.tsx` | Live components | 8 |
| `supabase/schema.sql` | Database schema | 6 |
| `supabase/migrations/*.sql` | Migrations | 3 |
| `src/app/debug/page.tsx` | Test utilities | 2 |
| `src/app/api/*.ts` | API routes | 2 |

---

## 10. CONCLUSION

The incident creation system is **functionally working** after the stale closure fix. However, significant gaps exist in:

1. **Security:** RLS policies have critical holes that could allow data manipulation
2. **Reliability:** Silent failures can cause incidents to be lost without notification
3. **Maintainability:** Type safety and documentation are lacking

**Recommendation:** Address CRITICAL and HIGH priority items before production deployment.

---

*Generated by Ralph Loop + Debug/Review/Explore Skills*
*Date: 2026-01-21*
