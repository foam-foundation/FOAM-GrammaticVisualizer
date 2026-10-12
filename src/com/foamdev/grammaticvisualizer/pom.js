foam.POM({
  name: 'sentence',
  projects: [
    { name: 'test/pom',                 flags: 'test' }
  ],
  files: [
    { name: 'Sentence',                       flags: 'js|java' },
    { name: 'GrammarVisualizerView',          flags: 'web' },
    { name: 'theme/ThemeDetailView',          flags: 'web' },
    { name: 'theme/ThemeColoursView',         flags: 'web' },
    { name: 'theme/TokenOverridesView',       flags: 'web' },
    { name: 'theme/TokenCatalogueView',       flags: 'web' },
    { name: 'theme/ThemeTokensView',          flags: 'web' },
    { name: 'theme/ThemeImagesView',          flags: 'web' },
    { name: 'theme/InputSizingView',          flags: 'web' }
  ]
});
