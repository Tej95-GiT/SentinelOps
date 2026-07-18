/**
 * Business Rule: Generate Checklist Results
 * Table:         x_1858206_sentin_0_readiness_assessment
 * When:          after | Insert
 * Condition:     current.policy is not empty
 *
 * Description:   On assessment creation, invokes ChecklistGenerator to clone
 *                all active policy_criteria records into checklist_result rows
 *                for this assessment. The idempotency guard inside
 *                ChecklistGenerator prevents duplicate generation.
 *
 * Source:         50e1684c3b8d8310982a9dc643e45a23/update/
 *                 sys_script_a3aed3ed3b810350982a9dc643e45a9c.xml
 *
 * Note: This is the original single-scope call. Later versions
 *       (sys_script_cc5603963b650714982a9dc643e45aee.xml and
 *       sys_script_00551078ea5641aba593b1da50ea8eca.xml) call the
 *       scoped class as x_1858206_sentin_0.ChecklistGenerator —
 *       this version uses the implicit scope reference.
 */
(function executeRule(current, previous) {

    // Must have policy
    if (!current.getValue('policy')) {

        gs.info('[SentinelOps] No policy linked. Skipping checklist generation.');

        return;
    }

    var generator = new ChecklistGenerator();
    generator.generateFromPolicy(current);

})(current, previous);
