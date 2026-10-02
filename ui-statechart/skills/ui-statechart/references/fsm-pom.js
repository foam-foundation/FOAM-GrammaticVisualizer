/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// ui-statechart: the ONE place that says where foam.FSM (FSM, StateMachineEnum, FSMDiagramView) is loaded from.
// Spike pages list this pom after foam3's; pack-spike.mjs builds its bin from it too.
// foam.FSM lives in foam3 (src/foam/lang/) and foam3's own pom loads it, so the projects list below is empty.
// If foam.FSM ever loads from somewhere else, list that pom here; nothing else in the skill changes.
// Paths are relative to this file (.claude/skills/ui-statechart/references/ -> checkout root is four levels up).
foam.POM({
  name: 'ui-statechart-fsm',
  projects: []
});
