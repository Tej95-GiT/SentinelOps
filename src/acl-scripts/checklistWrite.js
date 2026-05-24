/**
 * ACL: x_1858206_sentin_0_checklist_result — write
 * Applied To: ACL D5 (assessor write condition)
 * Roles on ACL: x_1858206_sentin_0.assessor
 *
 * Allows:
 *   - admin: all records (handled by separate admin write ACL)
 *   - assessor: only checklist results linked to their own assessment
 *   - viewer: never (no write ACL exists for viewer)
 *
 * Assumption: checklist_result has a reference field named 'assessment'
 *             pointing to x_1858206_sentin_0_readiness_assessment.
 *
 * Future: If the Business Rule auto-generates checklist results (Phase 3.7),
 *         that BR runs as system and bypasses this ACL check entirely.
 *         This script only restricts manual UI writes by assessors.
 */
(function () {
    if (gs.hasRole('x_1858206_sentin_0.admin')) {
        return true;
    }
    if (gs.hasRole('x_1858206_sentin_0.assessor')) {
        var assessment = current.assessment.getRefRecord();
        return assessment.assigned_to == gs.getUserID();
    }
    return false;
})();
