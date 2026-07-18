/**
 * Business Rule: SentinelOps: Trigger CSDM Evaluation
 * Table:         x_1858206_sentin_0_readiness_assessment
 * When:          before | Insert/Update (exact condition in ServiceNow PDI)
 * Description:   Invokes CSDMTraversalEngine.evaluateServiceReadiness() for the
 *                assessment's service_ci. Stamps the raw JSON result into
 *                assessment_telemetry for Now Assist / AI ingestion, and writes
 *                a human-readable findings summary into technical_quality_findings
 *                for the Analyst Workspace persona.
 *
 * Source:         Three identical copies exist in the update/ directory:
 *                 sys_script_8f0bf0de98b94269bb619957fd914b99.xml
 *                 sys_script_1248e15b094a4a18817d0b9d374617d6.xml
 *                 sys_script_e02531c172e748bfa3ec135dc56dc759.xml
 *
 *                 These three files are functionally identical. They appear to be
 *                 iterative development artifacts created during PDI testing.
 *                 All three are active in the ServiceNow application. Production
 *                 hardening (Phase 2) will consolidate to a single authoritative
 *                 rule and delete the redundant copies.
 *
 * Known Constraints (see KNOWN_LIMITATIONS_AND_ROADMAP.md):
 *   - The try/catch silent failure pattern logs to gs.error() but does not surface
 *     the error to the user. A CSDMTraversalEngine exception is indistinguishable
 *     from a genuine CSDM non-compliance result in the current UI.
 *   - The CSDM evaluation runs synchronously on every assessment insert/update
 *     where service_ci is populated. Phase 2 targets async execution via a
 *     Flow Designer script step to remove this from the synchronous write path.
 */
(function executeRule(current, previous /*null when async*/) {
    try {
        // Defensive check: Ensure we actually have a sys_id
        var ciId = current.getValue('service_ci'); 
        if (!ciId) return;

        // Instantiate our custom traversal engine
        var engine = new x_1858206_sentin_0.CSDMTraversalEngine();
        var result = engine.evaluateServiceReadiness(ciId);
        
        // 1. Stamp the raw JSON for future AI (Now Assist) ingestion
        current.assessment_telemetry = JSON.stringify(result);
        
        // 2. Translate the JSON into human-readable text for the Analyst Persona
        if (result.is_compliant === false) {
            current.technical_quality_findings = "--- AUTOMATED CSDM FINDINGS ---\n" + result.findings.join('\n');
        } else {
            current.technical_quality_findings = "--- AUTOMATED CSDM FINDINGS ---\nCSDM Structure Verified. No structural gaps detected.";
        }

    } catch (ex) {
        // Silent failure protection: Log to platform but don't break the user's transaction
        gs.error('SentinelOps Engine Error [Trigger CSDM Evaluation]: ' + ex.message);
    }
})(current, previous);
