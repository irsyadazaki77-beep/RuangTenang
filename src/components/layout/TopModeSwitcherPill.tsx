import React from 'react';
import { useInRouterContext, useLocation, useNavigate } from 'react-router-dom';
import { Compass, GraduationCap, Code2 } from 'lucide-react';
import { WorkspaceMode } from '../../features/workspace/types';
import { getWorkspaceModeFromPath } from '../../features/workspace/utils/workspaceRouting';

interface Props {
  activeMode?: WorkspaceMode;
  onSwitchMode?: (mode: WorkspaceMode) => void;
  className?: string;
}

const MODES: Array<{
  id: WorkspaceMode;
  label: string;
  shortLabel: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  activeClass: string;
}> = [
  {
    id: 'RUANG_TENANG',
    label: 'RuangTenang',
    shortLabel: 'Tenang',
    path: '/',
    icon: Compass,
    activeClass: 'bg-teal-700 text-white shadow-2xs'
  },
  {
    id: 'RUANG_KERJA',
    label: 'RuangKerja',
    shortLabel: 'Kerja',
    path: '/workspace',
    icon: GraduationCap,
    activeClass: 'bg-indigo-600 text-white shadow-2xs'
  },
  {
    id: 'RUANG_CODER',
    label: 'RuangCoder',
    shortLabel: 'Coder',
    path: '/coder',
    icon: Code2,
    activeClass: 'bg-sky-600 text-white shadow-2xs'
  }
];

function InnerSwitcher({ activeMode, onSwitchMode, className = '' }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const current = activeMode || getWorkspaceModeFromPath(location.pathname);

  const handleSelect = (mode: WorkspaceMode, path: string) => {
    if (onSwitchMode) {
      onSwitchMode(mode);
    } else {
      navigate(path);
    }
  };

  return (
    <nav
      aria-label="Pengalih Mode Ruang"
      className={`hidden md:inline-flex h-9 items-center gap-0.5 p-1 rounded-full border border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-white/5 backdrop-blur-md text-xs font-medium select-none shadow-3xs transition-all ${className}`}
    >
      {MODES.map(item => {
        const Icon = item.icon;
        const isActive = current === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleSelect(item.id, item.path)}
            aria-current={isActive ? 'page' : undefined}
            className={`inline-flex h-7 items-center gap-1.5 px-3 rounded-full transition-all duration-200 cursor-pointer btn-tactile ${
              isActive
                ? `${item.activeClass} font-semibold ring-1 ring-black/5 dark:ring-white/10`
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-white/10'
            }`}
            title={`Beralih ke ${item.label}`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span className="tracking-tight">{item.shortLabel}</span>
          </button>
        );
      })}
    </nav>
  );
}

export const TopModeSwitcherPill: React.FC<Props> = React.memo((props) => {
  const inRouter = useInRouterContext();
  if (!inRouter) return null;
  return <InnerSwitcher {...props} />;
});

TopModeSwitcherPill.displayName = 'TopModeSwitcherPill';

