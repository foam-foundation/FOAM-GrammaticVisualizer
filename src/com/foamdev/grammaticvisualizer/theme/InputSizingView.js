/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'com.foamdev.grammaticvisualizer.theme',
  name: 'InputSizingView',
  extends: 'foam.u2.View',

  documentation: `
    The Inputs section of a Theme: inputHeight, inputVerticalPadding and
    inputHorizontalPadding. They are CSS lengths; ApplicationController expands
    $inputHeight / $inputVerticalPadding / $inputHorizontalPadding in every
    stylesheet from them (the base tokens of the same name are the fallback).
    Rendered as the plain fields with help, plus a live sample box that applies
    the three values, so a change is visible before Save.
  `,

  requires: [ 'foam.u2.detail.SectionView' ],

  messages: [
    { name: 'TITLE', message: 'Input sizing' },
    { name: 'HELP', message: 'CSS lengths. They become $inputHeight, $inputVerticalPadding and $inputHorizontalPadding in every stylesheet; empty means the base token (34px, 8px, 8px).' },
    { name: 'HELP_HEIGHT', message: 'Height of text inputs, selects and date fields. Base token: 34px.' },
    { name: 'HELP_VPAD', message: 'Top and bottom padding inside an input. Base token: 8px.' },
    { name: 'HELP_HPAD', message: 'Left and right padding inside an input. Base token: 8px.' },
    { name: 'SAMPLE', message: 'Sample' },
    { name: 'SAMPLE_TEXT', message: 'A text input at these sizes' }
  ],

  css: `
    << { display: flex; flex-direction: column; gap: $space-3; }
    <<help { color: $textSecondary; }
    <<sample {
      box-sizing: border-box;
      display: flex; align-items: center;
      max-width: 24rem;
      border: 1px solid $borderDefault; border-radius: $inputBorderRadius;
      background: $backgroundDefault; color: $textDefault;
    }
  `,

  properties: [
    'section',
    'of',
    { class: 'Boolean', name: 'showTitle' },
    { class: 'Boolean', name: 'selected' }
  ],

  methods: [
    function render() {
      var self = this;
      this.addClass(this.myClass())
        .start().addClass('h500').add(this.TITLE).end()
        .start().addClass('p', this.myClass('help')).add(this.HELP).end()
        .tag(this.SectionView, {
          data$: this.data$, of$: this.of$, section: this.section, showTitle: false,
          config: {
            inputHeight:            { help: this.HELP_HEIGHT },
            inputVerticalPadding:   { help: this.HELP_VPAD },
            inputHorizontalPadding: { help: this.HELP_HPAD }
          }
        })
        .start().addClass('p-label').add(this.SAMPLE).end()
        .start().addClass(this.myClass('sample'))
          .style({
            height:          this.data$.dot('inputHeight').map(function(v) { return v || '32px'; }),
            'padding-top':   this.data$.dot('inputVerticalPadding').map(function(v) { return v || '8px'; }),
            'padding-bottom': this.data$.dot('inputVerticalPadding').map(function(v) { return v || '8px'; }),
            'padding-left':  this.data$.dot('inputHorizontalPadding').map(function(v) { return v || '8px'; }),
            'padding-right': this.data$.dot('inputHorizontalPadding').map(function(v) { return v || '8px'; })
          })
          .add(this.SAMPLE_TEXT)
        .end();
    }
  ]
});
