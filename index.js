const app = Vue.createApp({
  data: () => ({
    name: 'friend',
    normal: '',
    hover: '',
    active: '',
    nc: '',
    hoverBy: 'self',
    groupClass: 'group',
    isNc: false,
  }),
  computed: {
    params() {
      const { normal, hover, active } = this;
      return {
        normal,
        hover,
        active,
        nc: this.nc,
      };
    },
    parsed() {
      return {
        normal: this.parseHtml('normal'),
        hover: this.parseHtml('hover'),
        active: this.parseHtml('active'),
        nc: this.parseHtml('nc'),
      };
    },
    shapes() {
      return {
        normal: this.getShapes('normal'),
        hover: this.getShapes('hover'),
        active: this.getShapes('active'),
        nc: this.getShapes('nc'),
      };
    },
    filters() {
      const normal = this.getFilters('normal');
      const hover = this.getFilters('hover');
      const active = this.getFilters('active');
      active.forEach((af, i) => {
        const afc = af.cloneNode(true);
        afc.removeAttribute('id');
        [...afc.children].forEach((c) => c.removeAttribute('in'));
        [...afc.children].forEach((c) => c.removeAttribute('in2'));
        [...afc.children].forEach((c) => c.removeAttribute('result'));
        const same = hover.find((hf) => {
          const hfc = hf.cloneNode(true);
          hfc.removeAttribute('id');
          [...hfc.children].forEach((c) => c.removeAttribute('in'));
          [...hfc.children].forEach((c) => c.removeAttribute('in2'));
          [...hfc.children].forEach((c) => c.removeAttribute('result'));
          return afc.isEqualNode(hfc);
        });
        if (same) {
          console.log('same');
          active[i].setAttribute('id', same.getAttribute('id'));
        }
      });
      return { normal, hover, active };
    },
    uses() {
      const uses = [];
      this.shapes.normal.forEach((shape, i) => {
        ['hover', 'active'].forEach((type) => {
          this.filters[type].forEach((filter) => {
            const classes = ['opacity-0'];
            const use = document.createElement('use');
            use.setAttribute('href', `#id${i}`);
            use.setAttribute('filter', `url(#${filter.getAttribute('id')})`);
            classes.push(`${this.groupClass}-${type}:opacity-100`);
            if (type === 'hover') classes.push(`${this.groupClass}-active:opacity-0`);
            use.setAttribute('class', classes.join(' '));
            uses.push(use);
          });
        });
      });
      return uses;
    },
    final() {
      const { normal } = this.parsed;
      const final = { svg: null, allClasses: [] };
      if (!normal || !this.shapes.normal.length) return final;
      final.svg = normal.cloneNode(false);
      final.svg = this.removeSizes(final.svg);
      const shapesLengths = Object.values(this.shapes).map((s) => s.length);
      if (!shapesLengths.every((sl) => sl === shapesLengths[0])) return final;
      const allClasses = [];
      this.shapes.normal.forEach((shapeInit, i) => {
        const shape = shapeInit.cloneNode(true);
        const classes = ['fill-current', `text-[${shape.getAttribute('fill')}]`];
        shape.removeAttribute('fill');
        ['hover', 'active'].forEach((type) => {
          const color = this.shapes[type][i].getAttribute('fill');
          classes.push(`${this.groupClass}-${type}:text-[${color}]`);
        });
        classes.push(`nc:text-[${this.shapes.nc[i].getAttribute('fill')}]`);
        shape.setAttribute('class', classes.join(' '));
        final.svg.append(shape);
        allClasses.push(...classes);
      });
      const defs = document.createElement('defs');
      defs.append(...this.filters.hover, ...this.filters.active);
      final.svg.prepend(...this.uses);
      final.svg.append(defs);
      final.allClasses = [...new Set(allClasses)];
      return final;
    },
  },
  watch: {
    params(params) { localStorage.setItem('params', JSON.stringify(params)); },
    'final.allClasses': function(classes) {
      let styles = '';
      const group = this.hoverBy === 'self' ? `.${this.groupClass}` : 'svg';
      classes.splice(' ').forEach((c) => {
        if (c.indexOf('text') === -1) return;
        const color = c.match(/\[(.*)\]/)?.[1];
        if (!color) return;
        console.log(color);
        let pseudo = '';
        if (c.indexOf('hover') >= 0) {
          pseudo = `${group}:hover `;
        } else if (c.indexOf('active') >= 0) {
          pseudo = `${group}:active `;
        } else if (c.indexOf('nc:') >= 0) {
          pseudo = '.nc ';
        }
        const cl = c.replace('#', '\\#').replace('[', '\\[').replace(']', '\\]').replace(':', '\\:');
        styles += `${pseudo}.${cl} {color: ${color};}`;
      });
      document.getElementById('styles').innerHTML = styles;
    },
  },
  mounted() {
    const params = localStorage.params ? JSON.parse(localStorage.params) : {};
    Object.keys(params).forEach((param) => {
      if (params[param]) this[param] = params[param];
    });
  },
  methods: {
    parseHtml(param) {
      let el = null;
      try {
        const fakeEl = document.createElement('div');
        fakeEl.innerHTML = this[param].trim();
        el = fakeEl.firstChild;
      } catch (e) {
        console.log(e);
      }
      return el;
    },
    removeSizes(final) {
      const width = final.getAttribute('width');
      const height = final.getAttribute('height');
      const classes = [];
      if (width) classes.push(`w-[${(width / 16)}rem]`);
      if (height) classes.push(`h-[${(height / 16)}rem]`);
      if (this.hoverBy === 'self') classes.push(this.groupClass);
      final.setAttribute('class', classes.join(' '));
      final.removeAttribute('width');
      final.removeAttribute('height');
      return final;
    },
    getShapes(param) {
      const shapes = [];
      if (!this.parsed[param]) return shapes;
      Object.values(this.parsed[param].children).forEach((child) => {
        if (/^g$/i.test(child.nodeName)) {
          const filter = child.getAttribute('filter');
          // console.log(filter);
          Object.values(child.children).forEach((child2) => {
            const shape = child2.cloneNode(true);
            if (filter) shape.setAttribute('filter', filter);
            shapes.push(shape);
          });
        } else if (/^rect|path|circle|line|polygon|ellipse|polyline$/i.test(child.nodeName)) {
          shapes.push(child);
        }
      });
      // return shapes;
      return shapes.map((shape, i) => {
        const s = shape.cloneNode(true);
        s.setAttribute('id', `id${i}`);
        return s;
      });
    },
    getFilters(param) {
      const filters = [];
      if (!this.parsed[param]) return filters;
      const defs = this.parsed[param].querySelector('defs');
      if (!defs) return filters;
      Object.values(defs.children).forEach((child) => {
        if (!/^filter$/i.test(child.nodeName)) return;
        filters.push(child);
      });
      return filters;
    },
    toClipbooard() {
      if (this.final.svg) {
        const template = document.createElement('template');
        template.innerHTML = '<!-- eslint-disable max-len -->' + this.final.svg.outerHTML;
        navigator.clipboard.writeText(template.outerHTML);
      }
    },
    reset() {
      this.normal = '';
      this.hover = '';
      this.active = '';
      this.nc = '';
      this.hoverBy = 'self';
      this.groupClass = 'group';
      this.isNc = false;
    },
  },
});
app.mount('#app');
window.a = app._instance.ctx;
