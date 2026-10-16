foam.CLASS({
  package: 'com.foamdev.grammaticvisualizer.test',
  name: 'SentenceTest',
  extends: 'foam.core.test.Test',

  javaImports: [
    'com.foamdev.grammaticvisualizer.*',
    'foam.dao.DAO',
    'foam.lang.X'
  ],

  methods: [
    {
      name: 'runTest',
      javaCode: `
        var sentence = new Sentence();
        sentence.setName("test sentence");
        test ( sentence.getId() == 0, "ID unset before create");
        sentence = (Sentence) ((DAO) x.get("sentenceDAO")).put(sentence);
        test ( sentence.getId() != 0, "ID assigned by sentenceDAO (seqNo) after create");
      `
    }
  ]
});
