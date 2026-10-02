/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// Your app. Two classes: a model (what a Todo IS) and a view (what the page SHOWS).
// FOAM builds the form and the table from the model; you write no HTML for them.

foam.CLASS({
  package: 'starter',
  name: 'Todo',

  // Each property gets a type. The type decides the input FOAM draws for it.
  properties: [
    { class: 'Int',     name: 'id',   hidden: true },  // filled in by the DAO
    { class: 'String',  name: 'title' },
    { class: 'Date',    name: 'due' },
    { class: 'Boolean', name: 'done' }
  ]
});

foam.CLASS({
  package: 'starter',
  name: 'App',
  extends: 'foam.u2.Element',   // Element = a thing that can render into the page

  exports: [ 'as data' ],       // views added below find their data (this App) through the context

  requires: [
    'starter.Todo',
    'foam.dao.EasyDAO',
    'foam.u2.DetailView',
    'foam.u2.TableView'
  ],

  css: `
    ^ .row { display: flex; gap: 32px; flex-wrap: wrap; align-items: flex-start; }
    ^ .foam-u2-TableView { min-width: 420px; }
  `,

  properties: [
    {
      // A DAO is a collection you can put(), find(), select() on.
      // MDAO = in memory. Rows vanish on reload. Swap daoType later for storage.
      name: 'dao',
      factory: function() {
        return this.EasyDAO.create({ of: this.Todo, daoType: 'MDAO', seqNo: true });
      }
    },
    {
      // The Todo being edited. DetailView draws one input per property.
      name: 'todo',
      view: { class: 'foam.u2.DetailView' },
      factory: function() { return this.Todo.create({ title: 'Try FOAM' }); }
    }
  ],

  methods: [
    function init() {
      // seed two rows so the table is not empty on first load
      this.dao.put(this.Todo.create({ title: 'Read app.js', done: true }));
      this.dao.put(this.Todo.create({ title: 'Add a property to Todo' }));
    },

    function render() {
      // start('tag') opens an element, end() closes it, add(x) appends x.
      // Passing a PROPERTY (this.TODO, upper case) adds that property's view.
      this.addClass(this.myClass())
        .start('div').addClass('row')
          .start('div')
            .add(this.TODO)
            .add(this.ADD_TODO)      // an action becomes a button
          .end()
          .start(this.TableView, { data: this.dao, of: this.Todo }).end()
        .end();
    }
  ],

  actions: [
    {
      name: 'addTodo',   // not 'add': Element already has an add() method, same-name action would replace it
      label: 'Add',
      isEnabled: function(todo$title) { return !! todo$title; },   // re-evaluated when title changes
      code: function() {
        this.dao.put(this.todo.clone());
        this.todo = this.Todo.create();
      }
    }
  ]
});
