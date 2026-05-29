const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Dashboard.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replacements to support light/dark mode
const replacements = [
  { search: /bg-zinc-900/g, replace: 'bg-white dark:bg-slate-900' },
  { search: /bg-zinc-950/g, replace: 'bg-slate-50 dark:bg-slate-950' },
  { search: /border-zinc-800/g, replace: 'border-slate-200 dark:border-slate-800' },
  { search: /border-zinc-700/g, replace: 'border-slate-300 dark:border-slate-700' },
  { search: /text-white/g, replace: 'text-slate-900 dark:text-white' },
  { search: /text-zinc-500/g, replace: 'text-slate-500 dark:text-slate-400' },
  { search: /text-zinc-400/g, replace: 'text-slate-600 dark:text-slate-300' },
  { search: /text-zinc-600/g, replace: 'text-slate-500 dark:text-slate-500' },
  { search: /bg-zinc-800/g, replace: 'bg-slate-100 dark:bg-slate-800' },
  { search: /bg-zinc-700/g, replace: 'bg-slate-200 dark:bg-slate-700' },
];

replacements.forEach(({ search, replace }) => {
  content = content.replace(search, replace);
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Dashboard updated for dark mode.');
