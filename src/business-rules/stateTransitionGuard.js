/**
 * Business Rule: State Transition Guard
 * Table:         x_1858206_sentin_0_readiness_assessment
 * When:          before | Update
 * Order:         100
 * Condition:     current.state.changes()
 *
 * Description:   Enforces the readiness_assessment lifecycle state machine.
 *                Prevents invalid state transitions by aborting the record
 *                save via setAbortAction(true) before any data is committed.
 *                This is the only place state enforcement occurs — no flow
 *                or other BR replicates this check.
 *
 * Source:         50e1684c3b8d8310982a9dc643e45a23/update/
 *                 sys_script_ba49e7ed3b050350982a9dc643e45abb.xml
 *
 * State Machine:
 *   Draft (1)       → Submitted (10), Cancelled (100)
 *   Submitted (10)  → Draft (1), In Review (30), Blocked (50), Cancelled (100)
 *   In Review (30)  → Draft (1), Submitted (10), Approved (40), Blocked (50), Cancelled (100)
 *   Approved (40)   → [terminal — no transitions]
 *   Blocked (50)    → Submitted (10), Cancelled (100)
 *   Cancelled (100) → [terminal — no transitions]
 *
 * See: docs/decisions.md §D-003, §D-005
 */
(function executeRule(current, previous) {

    gs.info('STATE GUARD FIRED');

    // Safety guard
    if (!previous) {
        gs.info('NO PREVIOUS OBJECT');
        return;
    }

    // Only run if state changed
    if (!current.state.changes()) {
        return;
    }

    var fromState = previous.getValue('state');
    var toState = current.getValue('state');

    gs.info('FROM=' + fromState + ' TO=' + toState);

    // Allowed transitions
    var allowed = {

        '1':   ['10', '100'],              // Draft
        '10':  ['1', '30','50', '100'],    // Submitted
        '30':  ['1', '10', '40', '50', '100'], // In Review
        '40':  [],                         // Approved (terminal)
        '50':  ['10', '100'],              // Blocked
        '100': []                          // Cancelled (terminal)
    };

    // Unknown state safety
    if (!allowed[fromState]) {
        gs.info('UNKNOWN STATE - ALLOWING');
        return;
    }

    // Validate transition
    if (allowed[fromState].indexOf(toState) === -1) {

        gs.info('BLOCKED');

        gs.addErrorMessage(
            'Invalid state transition from "' +
            previous.state.getDisplayValue() +
            '" to "' +
            current.state.getDisplayValue() +
            '"'
        );

        current.setAbortAction(true);
        return;
    }

    gs.info('ALLOWED');

})(current, previous);
