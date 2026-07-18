/**
 * Business Rule: SentinelOps: Generate AI Telemetry
 * Table:         x_1858206_sentin_0_readiness_assessment
 * When:          before | Insert/Update
 * Description:   Constructs a structured JSON telemetry payload from the
 *                assessment record and writes it to the assessment_telemetry
 *                field. Designed for future Now Assist / AI processing pipelines.
 *
 * Source:         50e1684c3b8d8310982a9dc643e45a23/update/
 *                 sys_script_642b0b063bddcb90982a9dc643e45a17.xml
 *
 * Note on risk_tier:
 *   The telemetry payload includes risk_tier with a fallback of 'unassigned'.
 *   risk_tier is a USER-DEFINED categorical classification field — it is not
 *   computed by the ReadinessScorer or any other engine. It reflects whatever
 *   value the assessor manually selects on the assessment form.
 *   See KNOWN_LIMITATIONS_AND_ROADMAP.md §Phase 2 for the computed risk tier roadmap item.
 */
(function executeRule(current, previous /*null when async*/) {
    
    // 1. Construct the structured data payload
    var telemetry = {
        assessment_id: current.getUniqueValue(),
        state: current.getValue('state'),
        risk_tier: current.getValue('risk_tier') || 'unassigned', 
        timestamp: new GlideDateTime().getValue(),
        ci: current.getValue('service_ci')
    };

    // 2. Convert to JSON and write to the field
    // UPDATE THIS FIELD NAME IF SERVICENOW ADDED A PREFIX IN THE DICTIONARY
    current.assessment_telemetry = JSON.stringify(telemetry);
    
    // 3. Log the execution for platform auditability
    gs.info('SentinelOps AI Telemetry captured for: ' + current.getValue('number'));

})(current, previous);
