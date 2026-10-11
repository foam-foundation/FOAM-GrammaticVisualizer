foam.CLASS({
  package: 'com.foamdev.grammaticvisualizer.test',
  name: 'SentenceTest',
  extends: 'foam.core.test.Test',

  javaImports: [
    'com.foamdev.grammaticvisualizer.*',
    'foam.dao.DAO',
    'foam.lang.X',
    'foam.util.SafetyUtil'
  ],

  methods: [
    {
      name: 'runTest',
      javaCode: `
        var sentence = new Sentence();
        test ( SafetyUtil.isEmpty(sentence.getId()), "ID empty before create");
        sentence = (Sentence) ((DAO) x.get("sentenceDAO")).put(sentence);
        test ( ! SafetyUtil.isEmpty(sentence.getId()), "ID set after create");
      `
    }
  ]
});
