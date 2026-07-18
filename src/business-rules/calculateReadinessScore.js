/**
 * Business Rule: Calculate Readiness Score
 * Table:         x_1858206_sentin_0_checklist_result
 * When:          after | Insert, Update
 * Condition:     current.result.changes()
 *
 * Description:   Fires whenever an assessor updates a checklist_result record.
 *                Calls ReadinessScorer.calculateScore() and writes the updated
 *                score, gate, and pass/total counts back to the parent assessment.
 *                setWorkflow(false) prevents this update from re-triggering
 *                Business Rules on readiness_assessment (cascade guard).
 *
 * Source:         50e1684c3b8d8310982a9dc643e45a23/update/
 *                 sys_script_c34d50953bc90f10982a9dc643e45afd.xml
 *
 * Known Constraints (see KNOWN_LIMITATIONS_AND_ROADMAP.md):
 *   - Executes synchronously on every checklist_result update.
 *   - ReadinessScorer performs a full GlideRecord scan of all checklist_result
 *     rows for the parent assessment on every invocation (no setLimit).
 *   - Under concurrent assessor load this creates N synchronous full-table
 *     scans per save. Targeted for async execution in Phase 2.
 *
 * See: docs/decisions.md §D-008
 */
(function executeRule(current, previous) {

	gs.info('BR RUNNIG');

    if (!current.assessment) return;
    if (!current.result) return;

    var scorer = new ReadinessScorer();
    var result = scorer.calculateScore(current.assessment.toString());

    var gr = new GlideRecord('x_1858206_sentin_0_readiness_assessment');

    if (gr.get(current.assessment)) {

        gr.setValue('criteria_total', result.total);
        gr.setValue('criteria_passed', result.passed);
        gr.setValue('readiness_score', result.score);
        gr.setValue('gate_result', result.gate);

        gr.autoSysFields(false);
        gr.setWorkflow(false);

        gr.update();
    }

})(current, previous);
