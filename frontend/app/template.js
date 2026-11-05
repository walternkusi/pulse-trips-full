// PAGE TRANSITION: a template (unlike a layout) is created afresh on every navigation,
// so each new page fades in. Opacity only: no transform, so sticky/fixed elements stay put.
export default function Template({ children }) {
  return <div className="page-enter">{children}</div>;
}
