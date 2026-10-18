/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'com.foamdev.grammaticvisualizer.theme',
  name: 'ThemeImagesView',
  extends: 'foam.u2.View',

  documentation: `
    The Icons / Images section of a Theme. Each Image field is a card: the
    picture bounded to a preview box, shown on the light and on the dark
    surface, with the value (a URL, a path or a data: URI) in a textarea
    beside it. foam3's default is a TextArea plus an unbounded ImageView, so a
    full-size logo takes the page. The section's other fields (largeLogoEnabled,
    logoBackgroundColour) render as plain property views under the cards.
  `,

  requires: [ 'foam.u2.tag.Image' ],

  messages: [
    { name: 'HELP', message: 'A URL, a path under /images, or a data: URI. SVG is embedded inline; prefer it, or a PNG at 2x.' },
    { name: 'NONE', message: 'no image' },
    { name: 'LIGHT', message: 'light' },
    { name: 'DARK', message: 'dark' }
  ],

  css: `
    << { display: flex; flex-direction: column; gap: $space-3; }
    <<help { color: $textSecondary; }
    <<card { display: grid; grid-template-columns: auto 1fr; grid-template-rows: auto auto; gap: $space-2 $space-3; border: 1px solid $borderLight; border-radius: $radius; padding: $space-2; background: $backgroundDefault; }
    <<cardTitle { grid-column: 1 / -1; }
    <<value { align-self: start; }
    <<previews { display: flex; gap: $space-2; }
    <<box {
      width: 15rem; height: 7.5rem;
      display: flex; align-items: center; justify-content: center;
      border-radius: $radius; border: 1px solid $borderLight;
      position: relative; overflow: hidden;
    }
    /* rem, not %: the picture sits in a slot wrapper with no height of its own, so a % max-height resolves to none. */
    <<box img, <<box svg { max-width: 13.5rem; max-height: 6.5rem; width: auto; height: auto; object-fit: contain; }
    <<box.light { background: $white; }
    <<box.dark { background: $black; }
    <<tag { position: absolute; left: $space-1; top: $space-1; background: $backgroundDefault; color: $textSecondary; padding: 0 $space-1; border-radius: $radius; }
    <<none { color: $textTertiary; }
    <<rest { display: grid; grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr)); gap: $space-3; }
    /* One line that grows with a long data: URI, instead of an 80px box for a short path. */
    <<card textarea { width: 100%; box-sizing: border-box; font-family: monospace; field-sizing: content; min-height: 3.4rem; max-height: 12rem; }
  `,

  properties: [
    'section',
    'of',
    { class: 'Boolean', name: 'showTitle' },
    { class: 'Boolean', name: 'selected' },
    {
      name: 'imageProps',
      expression: function(section) {
        return ( section ? section.properties : [] ).filter(function(p) { return foam.lang.Image.isInstance(p); });
      }
    },
    {
      name: 'otherProps',
      expression: function(section) {
        return ( section ? section.properties : [] ).filter(function(p) { return ! foam.lang.Image.isInstance(p); });
      }
    }
  ],

  methods: [
    function render() {
      var self = this;
      this.addClass(this.myClass())
        .start().addClass('p', this.myClass('help')).add(this.HELP).end()
        .add(this.slot(function(imageProps) {
          return this.E().forEach(imageProps, function(p) { self.renderCard(this, p); });
        }))
        .add(this.slot(function(otherProps) {
          return this.E().addClass(self.myClass('rest')).forEach(otherProps, function(p) {
            this.add(p.toPropertyView({ data$: self.data$ }, self.__subContext__));
          });
        }));
    },

    function renderCard(parent, p) {
      var self  = this;
      var value = this.data$.dot(p.name);
      parent.start().addClass(this.myClass('card'))
        .start().addClass('p-label', this.myClass('cardTitle')).add(p.label || p.name).end()
        .start().addClass(this.myClass('previews'))
          .call(function() { self.renderBox(this, value, 'light', self.LIGHT); })
          .call(function() { self.renderBox(this, value, 'dark', self.DARK); })
        .end()
        .start().addClass(this.myClass('value'))
          .add(p.clone().copyFrom({ label: '', view: { class: 'foam.u2.tag.TextArea', rows: 1 } })
            .toPropertyView({ data$: this.data$ }, this.__subContext__))
        .end()
      .end();
    },

    function renderBox(row, value, cls, label) {
      var self = this;
      row.start().addClass(this.myClass('box'), cls)
        .start('span').addClass('p-label', this.myClass('tag')).add(label).end()
        .add(value.map(function(v) {
          return v ?
            self.Image.create({ data: v, embedSVG: true }, self) :
            self.E('span').addClass('p', self.myClass('none')).add(self.NONE);
        }))
      .end();
    }
  ]
});
