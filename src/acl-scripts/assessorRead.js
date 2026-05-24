/**
 * ACL: x_1858206_sentin_0_readiness_assessment — read
 * Applied To: ACL A2 (assessor + viewer read condition)
 * Roles on ACL: x_1858206_sentin_0.assessor, x_1858206_sentin_0.viewer
 *
 * Allows:
 *   - admin: all records (handled by separate admin ACL — this script not needed for admin)
 *   - viewer: all assessment records (read-only role)
 *   - assessor: own records only (assigned_to == current user)
 *
 * NOTE: This script runs inside a scoped app context.
 *       Use gs.getUserID() — not gs.getUser().getID().
 *       Use gs.info() for debug logging — not gs.log().
 */
(function () {
    if (gs.hasRole('x_1858206_sentin_0.admin')) {
        return true;
    }
    if (gs.hasRole('x_1858206_sentin_0.viewer')) {
        return true;
    }
    if (gs.hasRole('x_1858206_sentin_0.assessor')) {
        return current.assigned_to == gs.getUserID();
    }
    return false;
})();
