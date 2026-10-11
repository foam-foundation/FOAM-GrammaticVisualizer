/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.POM({
  name: 'foam-grammatic-visualizer',
  excludes: [ '*' ],
  projects: [
    { name: 'foam3/pom' },
    { name: 'src/foam/parse/rail/pom',      flags: 'web' },
    { name: 'src/foam/parse/rail/test/pom', flags: 'test' }
  ]
});
