/**
 * Script Include: CSDMTraversalEngine
 * Scope:          x_1858206_sentin_0
 * Table:          N/A (called by the "SentinelOps: Trigger CSDM Evaluation" Business Rule)
 * Description:    Validates that a given Configuration Item (CI) is structurally
 *                 compliant with the Common Service Data Model (CSDM). Performs
 *                 a recursive upstream traversal of cmdb_rel_ci to confirm the CI
 *                 rolls up to a cmdb_ci_business_app node, validates owner and
 *                 support group population, and returns a structured findings object.
 *
 * Source:         Extracted from ServiceNow XML artifact
 *                 50e1684c3b8d8310982a9dc643e45a23/update/
 *                 sys_script_include_e0b9556e3b918f90982a9dc643e45a16.xml
 *
 * Known Constraints (see KNOWN_LIMITATIONS_AND_ROADMAP.md):
 *   - maxDepth = 5 caps recursion. CIs nested deeper than 5 levels in cmdb_rel_ci
 *     will return a false-negative compliance result (foundBusinessApp = false).
 *     This is a deliberate safety guard to prevent runaway recursion on circular
 *     CMDB relationship graphs; the trade-off is accepted for v1.
 *   - Each recursive call issues a new GlideRecord query against cmdb_rel_ci.
 *     On a CMDB with 500,000+ CIs and dense relationship graphs, this is an
 *     O(N * depth) query pattern. Targeted for async execution in Phase 2.
 *   - No visited-set cycle detection beyond maxDepth guard. Circular relationships
 *     are handled only by the depth limit, not by explicit cycle tracking.
 */
var CSDMTraversalEngine = Class.create();
CSDMTraversalEngine.prototype = {
    initialize: function() {
        // cap it at 5 levels so we don't blow up the instance on circular CMDB loops
        this.maxDepth = 5; 
    },

    evaluateServiceReadiness: function(ciSysId) {
        var result = {
            status: "success",
            target_ci: "",
            ci_class: "",
            is_compliant: false, // defensive default so orphans don't auto-pass
            findings: []
        };

        // 1. verify CI actually exists in db first
        var grCI = new GlideRecord('cmdb_ci');
        if (!grCI.get(ciSysId)) {
            result.status = "error";
            result.findings.push("CI not found.");
            return result;
        }

        result.target_ci = grCI.getValue('name');
        result.ci_class = grCI.getValue('sys_class_name');

        // 2. Check for missing basic data (classic CMDB health stuff)
        // gotta make sure we have owners otherwise governance routing breaks later
        if (gs.nil(grCI.getValue('owned_by'))) {
            result.findings.push("CRITICAL: CI is missing an Owner.");
        }
        if (gs.nil(grCI.getValue('support_group'))) {
            result.findings.push("CRITICAL: CI is missing a Support Group.");
        }

        // 3. Start traversal to find the Business App
        // kicking off the recursive walk upwards
        var foundBusinessApp = this._traverseUpstreamForApp(ciSysId, 0);

        if (!foundBusinessApp) {
            result.findings.push("CRITICAL: CI does not roll up to a cmdb_ci_business_app. CSDM structure is broken.");
        }

        // if the findings array is empty, we survived the gauntlet
        if (result.findings.length === 0) {
            result.is_compliant = true;
        }

        return result;
    },

    // helper function to recursively walk up cmdb_rel_ci
    // looking specifically for the business app layer
    _traverseUpstreamForApp: function(currentCiId, depth) {
        if (!depth) depth = 0;
        if (depth > this.maxDepth) return false; // bail out if we go too deep

        // check if the current CI we are standing on is a Business App
        var grCheck = new GlideRecord('cmdb_ci');
        if (grCheck.get(currentCiId) && grCheck.sys_class_name == 'cmdb_ci_business_app') {
            return true; // found it!
        }

        // query relationships where this CI is the child to go up one level
        var relGR = new GlideRecord('cmdb_rel_ci');
        relGR.addQuery('child', currentCiId);
        relGR.query();

        while (relGR.next()) {
            // go up one level recursively
            if (this._traverseUpstreamForApp(relGR.getValue('parent'), depth + 1)) {
                return true;
            }
        }
        
        // hit a dead end
        return false;
    },

    type: 'CSDMTraversalEngine'
};
