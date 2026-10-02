import React from 'react';
import { User, Brain, Bell, ShieldCheck, RotateCcw, Lock, CreditCard, Sparkles, ChevronRight, type LucideIcon } from 'lucide-react';
import { BrandLogo } from '../../../components/ui/BrandLogo';

export type SettingsTab = 'akun' | 'ai' | 'privasi' | 'memory' | 'keamanan' | 'langganan' | 'versi' | 'notifikasi';

const SETTINGS_TABS: Array<{ id: SettingsTab; label: string; icon: LucideIcon }> = [
  { id: 'akun', label: 'Akun', icon: User },
  { id: 'ai', label: 'Preferensi AI', icon: Brain },
  { id: 'notifikasi', label: 'Notifikasi', icon: Bell },
  { id: 'privasi', label: 'Privasi', icon: ShieldCheck },
  { id: 'memory', label: 'Memory', icon: RotateCcw },
  { id: 'keamanan', label: 'Keamanan', icon: Lock },
  { id: 'langganan', label: 'Langganan', icon: CreditCard },
  { id: 'versi', label: 'Versi & Pembaruan', icon: Sparkles }
];

interface SettingsSectionNavProps {
  activeTab: SettingsTab;
  showMobileDetail: boolean;
  onSelect: (tab: SettingsTab) => void;
}

export function SettingsSectionNav({ activeTab, showMobileDetail, onSelect }: SettingsSectionNavProps) {
  return (
    <nav aria-label="Navigasi pengaturan" className={`w-full md:w-64 shrink-0 flex flex-col gap-2 ${showMobileDetail ? 'hidden md:flex' : 'flex'}`}>
      <div className="hidden md:flex items-center gap-2 mb-2 px-2">
        <BrandLogo size="xs" iconOnly />
        <h2 className="text-lg font-bold text-primary">Pengaturan</h2>
      </div>
      <div className="flex flex-col gap-1.5 md:gap-1">
        {SETTINGS_TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelect(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-h-[44px] items-center justify-between md:justify-start gap-3 px-4 py-3 sm:py-3.5 md:py-2.5 rounded-xl text-sm font-medium transition-all duration-150 btn-press-compact border border-transparent cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                isActive ? 'bg-teal-50 text-teal-700 md:bg-teal-50 md:text-teal-700' : 'text-secondary hover:surface-muted surface-muted/50 md:bg-transparent'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-teal-600' : 'text-muted'}`} />
                <span className="truncate">{tab.label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted md:hidden shrink-0" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
