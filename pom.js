foam.POM({
  name: 'grammaticVisualizer',
  excludes: [ '*' ],
  projects: [
    { name: 'foam3/pom'},
    { name: 'src/foam/parse/rail/pom',      flags: 'web' },
    { name: 'src/foam/parse/rail/test/pom', flags: 'test' },
    { name: 'src/com/foamdev/grammaticvisualizer/pom'},
    { name: 'journals/pom' }
  ],
  licenses: `
    // Add your license header here
  `,
  envs: {
    version: '1.0.0',
    // javaMainArgs: 'spid:grammaticVisualizer'
  },
  tasks: [
    function javaManifest() {
      JAVA_MANIFEST_VENDOR_ID = 'grammaticvisualizer.foamdev.com';
    }
  ]
});
