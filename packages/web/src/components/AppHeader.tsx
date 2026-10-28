import { Link } from '@tanstack/react-router';
import { ReefWidget } from './ReefWidget';
import { ThemeToggle } from './ThemeToggle';

const LINKS = [
  ['/', 'Reef'],
  ['/connect', 'Connect'],
] as const;

export function AppHeader() {
  return (
    <nav className="flex items-center gap-1 border-b border-zinc-200 bg-white px-3 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-900">
      <Link to="/" className="mr-3 flex items-center gap-2 font-semibold tracking-tight hover:text-teal-600 dark:hover:text-teal-400">
        <img src="/icon.png" alt="" width={28} height={28} />
        The Great Token Reef
      </Link>
      {LINKS.map(([to, label]) => (
        <Link
          key={to}
          to={to}
          className="rounded-md px-2 py-1 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 [&.active]:bg-teal-50 [&.active]:font-medium [&.active]:text-teal-700 dark:[&.active]:bg-teal-950 dark:[&.active]:text-teal-300"
          activeOptions={{ exact: to === '/' }}
        >
          {label}
        </Link>
      ))}
      <span className="ml-auto flex items-center gap-2"><ThemeToggle /><ReefWidget /></span>
    </nav>
  );
}
