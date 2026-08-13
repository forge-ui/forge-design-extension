import { Component } from 'react';
import { createRoot } from 'react-dom/client';
import { sample, TIGHT_KINDS, WIDE_KINDS } from './samples.jsx';

const roots = new WeakMap();
let kitSheet;
let kitHref = '';

export async function adoptKit(shadow, href) {
  if (!shadow || !href) return;
  if (!kitSheet || kitHref !== href) {
    const css = await fetch(href).then((res) => res.text());
    kitSheet = new CSSStyleSheet();
    kitSheet.replaceSync(css);
    kitHref = href;
  }
  if (!shadow.adoptedStyleSheets.includes(kitSheet)) {
    shadow.adoptedStyleSheets = [...shadow.adoptedStyleSheets, kitSheet];
  }
}

class PreviewError extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.warn('[Forge palette]', this.props.name, error);
  }

  render() {
    if (this.state.error) {
      return <div className="fp-error">{this.props.name}</div>;
    }
    return this.props.children;
  }
}

function classFor(kind, surface, exportName) {
  if (surface === 'ghost') {
    if (exportName === 'TopBar') return 'fp-stage is-ghost is-hairline';
    if (TIGHT_KINDS.includes(kind)) return 'fp-stage is-ghost is-tight';
    return 'fp-stage is-ghost';
  }
  if (exportName === 'TopBar') return 'fp-stage is-hairline';
  if (kind === 'layout' || kind === 'nav') return 'fp-stage is-layout';
  if (TIGHT_KINDS.includes(kind)) return 'fp-stage is-tight';
  if (WIDE_KINDS.includes(kind)) return 'fp-stage is-wide';
  return 'fp-stage';
}

export function mount(el, spec = {}) {
  if (!el) return;
  el.className = classFor(spec.kind, spec.surface, spec.exportName);
  let root = roots.get(el);
  if (!root) {
    root = createRoot(el);
    roots.set(el, root);
  }
  const name = spec.exportName || spec.name || 'Forge';
  root.render(
    <PreviewError name={name}>
      {sample(name, spec.variant, spec.surface)}
    </PreviewError>,
  );
}

export function unmount(el) {
  const root = roots.get(el);
  if (!root) return;
  root.unmount();
  roots.delete(el);
}
