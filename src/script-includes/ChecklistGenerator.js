/**
 * Script Include: ChecklistGenerator
 * Scope:          x_1858206_sentin_0
 * Table:          N/A (called by Business Rules on readiness_assessment insert)
 * Description:    Generates checklist_result records for a given assessment by
 *                 cloning the active policy_criteria items and denormalizing
 *                 the mandatory flag and weight at generation time.
 *
 * Source:         Extracted from ServiceNow XML artifact
 *                 50e1684c3b8d8310982a9dc643e45a23/update/
 *                 sys_script_include_34481b6d3b810350982a9dc643e45a0b.xml
 *
 * Design Decisions:
 *   - Denormalization (copying mandatory + weight to checklist_result) is
 *     intentional — see docs/decisions.md §D-007. In-flight assessments must
 *     be immutable to policy changes.
 *   - Idempotency guard (setLimit(1) existence check) prevents duplicate
 *     checklist generation if the generating BR fires more than once.
 *   - generateFromPolicy() requires a GlideRecord object, not a sys_id string.
 *     The calling Business Rule must pass `current` directly.
 */
var ChecklistGenerator = Class.create();
ChecklistGenerator.prototype = {

    initialize: function() {
        // No setup required
    },

    generateFromPolicy: function(assessmentGR) {
        // Make sure we actually have a policy assigned before doing anything
        var policyId = assessmentGR.getValue('policy');
        if (gs.nil(policyId)) {
            gs.warn('ChecklistGenerator: Cannot generate checklist, no policy assigned to assessment ' + assessmentGR.getValue('number'));
            return;
        }

        // Quick sanity check: did we already generate a checklist for this?
        // Don't want to spam the related list with duplicates if someone clicks a UI action twice
        var existingGr = new GlideRecord('x_1858206_sentin_0_checklist_result');
        existingGr.addQuery('assessment', assessmentGR.getUniqueValue());
        existingGr.setLimit(1);
        existingGr.query();

        if (existingGr.hasNext()) {
            gs.info('ChecklistGenerator: Checklist already exists for this assessment. Skipping generation.');
            return;
        }

        // Grab the active criteria for the linked policy
        var criteriaGr = new GlideRecord('x_1858206_sentin_0_policy_criteria');
        criteriaGr.addQuery('policy', policyId);
        criteriaGr.addQuery('active', true);
        criteriaGr.query();

        var count = 0;
        while (criteriaGr.next()) {
            var checklistGr = new GlideRecord('x_1858206_sentin_0_checklist_result');
            checklistGr.initialize();

            // Map fields over using getValue to prevent reference pointer issues
            checklistGr.setValue('assessment', assessmentGR.getUniqueValue());
            checklistGr.setValue('criteria', criteriaGr.getUniqueValue());
            checklistGr.setValue('mandatory', criteriaGr.getValue('mandatory'));
            checklistGr.setValue('weight', criteriaGr.getValue('weight'));
            checklistGr.setValue('result', 'pending'); // default state for the analyst

            checklistGr.insert();
            count++;
        }
        
        gs.info('ChecklistGenerator: Successfully created ' + count + ' checklist items.');
    },

    type: 'ChecklistGenerator'
};
