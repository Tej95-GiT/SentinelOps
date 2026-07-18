/**
 * Script Include: ReadinessScorer
 * Scope:          x_1858206_sentin_0
 * Table:          N/A (called by Business Rules and Flow Designer script steps)
 * Description:    Calculates a weighted readiness score for a given assessment.
 *                 Returns a result object containing the numerical score, gate
 *                 decision, pass/total counts, and a mandatory-fail flag.
 *
 * Source:         Extracted from ServiceNow XML artifact
 *                 50e1684c3b8d8310982a9dc643e45a23/update/
 *                 sys_script_include_e4ab54913bc90f10982a9dc643e45ac2.xml
 *
 * Known Constraints (see KNOWN_LIMITATIONS_AND_ROADMAP.md):
 *   - The while(gr.next()) loop on checklist_result has no setLimit() call.
 *     This is an O(N) full-table scan per scoring invocation. Acceptable for
 *     current PDI scale; requires a debounce/async pattern for production
 *     instances with large policy criteria sets.
 *   - The scorer does not evaluate temporal factors (active incidents,
 *     CI operational_status, maintenance windows). Score reflects static
 *     CMDB/checklist state at the time of calculation.
 *   - risk_tier is NOT computed by this engine. It is a user-defined
 *     categorical classification field on readiness_assessment.
 */
var ReadinessScorer = Class.create();
ReadinessScorer.prototype = {

    initialize: function() {
        this.defaultThreshold = 70; // Fallback if policy doesn't define one
    },

    calculateScore: function(assessmentSysId) {
        if (!assessmentSysId) {
            gs.error('ReadinessScorer: No assessment ID provided.');
            return null;
        }

        // 1. Evaluate the checklist items
        var gr = new GlideRecord('x_1858206_sentin_0_checklist_result');
        gr.addQuery('assessment', assessmentSysId);
        gr.query();

        var total = 0;
        var passed = 0;
        var mandatoryFail = false;

        while (gr.next()) {
            total++;
            var result = gr.getValue('result');
            
            // Watch out for SN boolean field quirks (1/0 vs true/false)
            var isMandatory = (gr.getValue('mandatory') == '1' || gr.getValue('mandatory') == 'true');

            if (result === 'pass') {
                passed++;
            }

            // If a mandatory item fails or is pending, we block the gate
            if (isMandatory && result !== 'pass') {
                mandatoryFail = true;
                // Note: We don't break the loop here because we still want the overall numerical score
            }
        }

        // Protect against div by zero on empty checklists
        var score = (total === 0) ? 0 : Math.round((passed / total) * 100);

        // 2. Determine the threshold from the Policy
        var threshold = this.defaultThreshold;
        var assessmentGr = new GlideRecord('x_1858206_sentin_0_readiness_assessment');
        
        if (assessmentGr.get(assessmentSysId)) {
            var policyId = assessmentGr.getValue('policy');
            if (policyId) {
                var policyGr = new GlideRecord('x_1858206_sentin_0_readiness_policy');
                if (policyGr.get(policyId)) {
                    var configuredThreshold = parseInt(policyGr.getValue('pass_threshold'), 10);
                    if (!isNaN(configuredThreshold)) {
                        threshold = configuredThreshold;
                    }
                }
            }
        }

        // 3. Final Gate Calculation
        var gate = 'fail';
        if (!mandatoryFail && score >= threshold) {
            gate = 'pass';
        }

        gs.info('ReadinessScorer completed | Score: ' + score + ' | Gate: ' + gate + ' | Mandatory Fail: ' + mandatoryFail);

        return {
            score: score,
            passed: passed,
            total: total,
            gate: gate,
            mandatory_fail: mandatoryFail
        };
    },

    type: 'ReadinessScorer'
};
