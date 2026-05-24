/**
 * ACL: x_1858206_sentin_0_checklist_result — read
 * Applied To: ACL D2 (assessor + viewer read condition)
 * Roles on ACL: x_1858206_sentin_0.assessor, x_1858206_sentin_0.viewer
 *
 * Allows:
 *   - admin: all records (handled by separate admin ACL)
 *   - viewer: all checklist results (read-only role)
 *   - assessor: only checklist results linked to their own assessment
 *
 * Assumption: checklist_result has a reference field named 'assessment'
 *             pointing to x_1858206_sentin_0_readiness_assessment.
 *
 * Pre-build check: Run in Scripts - Background (scoped app context):
 *   var gr = new GlideRecord('x_1858206_sentin_0_checklist_result');
 *   gs.info(gr.isValid());
 *   // If true, the table and reference field are accessible.
 */
(function () {
    if (gs.hasRole('x_1858206_sentin_0.admin')) {
        return true;
    }
    if (gs.hasRole('x_1858206_sentin_0.viewer')) {
        return true;
    }
    if (gs.hasRole('x_1858206_sentin_0.assessor')) {
        var assessment = current.assessment.getRefRecord();
        return assessment.assigned_to == gs.getUserID();
    }
    return false;
})();
