/**
 * ACL: x_1858206_sentin_0_readiness_assessment — write
 * Applied To: ACL A5 (assessor write condition)
 * Roles on ACL: x_1858206_sentin_0.assessor
 *
 * Allows:
 *   - admin: all records (handled by separate admin write ACL — not this script)
 *   - assessor: own records only (assigned_to == current user)
 *   - viewer: never (no write ACL exists for viewer)
 *
 * Note: State transition enforcement is handled separately by the
 *       State Transition Guard Business Rule (Phase 3.4).
 *       This ACL only enforces ownership — the BR enforces valid state paths.
 */
(function () {
    if (gs.hasRole('x_1858206_sentin_0.admin')) {
        return true;
    }
    if (gs.hasRole('x_1858206_sentin_0.assessor')) {
        return current.assigned_to == gs.getUserID();
    }
    return false;
})();
