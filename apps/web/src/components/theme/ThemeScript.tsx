/**
 * Inline script that runs before React hydrates to prevent theme flash.
 * Must be placed in layout as a direct child of <head> or <body>.
 */
export function ThemeScript() {
  const script = `
(function() {
  var theme = localStorage.getItem('archmock-theme') || 'system';
  var dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (dark) document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
})();
`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
