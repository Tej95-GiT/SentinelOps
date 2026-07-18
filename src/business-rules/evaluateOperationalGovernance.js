/**
 * Business Rule: Evaluate Operational Governance
 * Table:         x_1858206_sentin_0_release_gate
 * When:          after | Insert
 * Description:   Fires when the SentinelOps Ingestion REST API creates a new
 *                release_gate record. Evaluates the tech_debt_score field against
 *                a hardcoded threshold (50) and sets the record state to
 *                'approved' or 'rejected' accordingly.
 *
 * Source:         50e1684c3b8d8310982a9dc643e45a23/update/
 *                 sys_script_bc2c43e03b050b10982a9dc643e45a96.xml
 *
 * Known Constraints (see KNOWN_LIMITATIONS_AND_ROADMAP.md):
 *   - tech_debt_score is compared as parseInt(). If the REST API receives a
 *     non-numeric string, parseInt() returns NaN. NaN > 50 === false, causing
 *     malformed payloads to auto-approve. Phase 2 adds strict type validation
 *     at the Scripted REST API layer before record insertion.
 *   - Threshold (50) is hardcoded. Phase 2 moves this to a System Property
 *     (x_1858206_sentin_0.governance_debt_threshold) for operator configurability.
 */
(function executeRule(current, previous /*null when async*/) {
    
    // 1. Fetch the technical intelligence metric (using your existing column)
    var techDebt = parseInt(current.tech_debt_score, 10);
    
    // 2. Define the Governance Threshold
    var maxDebtThreshold = 50; 
    
    // 3. The Governance Intelligence Engine
    if (techDebt > maxDebtThreshold) {
        // Fails governance standards
        current.state = 'rejected';
        gs.addErrorMessage("Governance Alert: Release rejected due to high technical debt risk.");
    } else {
        // Passes governance standards
        current.state = 'approved';
        gs.addInfoMessage("SentinelOps: Release meets technical intelligence governance standards.");
    }

})(current, previous);
