import { useEffect, useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { BadgeCheck, CircleHelp, Globe, Info, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ViewerAuthUser } from '@/features/auth/authSlice';
import { patchPreferences } from '@/shared/state/preferencesSlice';
import { useAppDispatch, useAppSelector } from '@/shared/state/store';
import { useCoreCopy } from '@/shared/theme/coreCopy';
import { fetchDashboardProfileSummary, type DashboardProfileSummary } from '@/pages/dashboard/DashboardSettingsDialog';

interface AccountMenuProps {
  align?: 'start' | 'center' | 'end';
  buttonClassName: string;
  imageClassName?: string;
  onSignOut: () => Promise<void>;
  sideOffset?: number;
  title?: string;
  user: ViewerAuthUser;
}

function getDisplayName(email?: string | null, username?: string | null) {
  return username?.trim() || email?.split('@')[0] || 'author';
}

export function AccountMenu({
  align = 'end',
  buttonClassName,
  imageClassName,
  onSignOut,
  sideOffset = 10,
  title,
  user,
}: AccountMenuProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const authSource = useAppSelector((state) => state.auth.source);
  const language = useAppSelector((state) => state.viewerPreferences.language);
  const copy = useCoreCopy();
  const [profileSummary, setProfileSummary] = useState<DashboardProfileSummary | null>(null);
  const demoProfileSummary: DashboardProfileSummary | null =
    authSource === 'demo'
      ? {
          avatarUrl: null,
          role: 'demo',
          username: user.displayName,
        }
      : null;

  useEffect(() => {
    if (authSource === 'demo') {
      return undefined;
    }

    let active = true;

    async function loadProfileSummary() {
      try {
        const profile = await fetchDashboardProfileSummary(user.id);
        if (active) {
          setProfileSummary(profile);
        }
      } catch {
        if (active) {
          setProfileSummary(null);
        }
      }
    }

    void loadProfileSummary();

    return () => {
      active = false;
    };
  }, [authSource, user.displayName, user.id]);

  const effectiveProfileSummary = demoProfileSummary ?? profileSummary;
  const displayName = getDisplayName(user.email, effectiveProfileSummary?.username);
  const avatarInitial = (displayName.trim()[0] ?? 'A').toUpperCase();
  const avatarUrl = effectiveProfileSummary?.avatarUrl?.trim() ?? '';
  const nextLanguage = language === 'en' ? 'zh-CN' : 'en';

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={buttonClassName}
          aria-label={copy.accountMenu.open}
          title={title ?? user.email ?? copy.brand.name}
        >
          {avatarUrl ? <img className={imageClassName} src={avatarUrl} alt="" /> : avatarInitial}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="studio-menu" align={align} sideOffset={sideOffset}>
          <DropdownMenu.Label className="studio-menu__label">{user.email}</DropdownMenu.Label>
          <DropdownMenu.Separator className="studio-menu__separator" />
          <DropdownMenu.Item className="studio-menu__item" onSelect={() => navigate('/settings')}>
            <BadgeCheck size={14} />
            <span>{copy.accountMenu.settings}</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item className="studio-menu__item" onSelect={() => navigate('/support/help')}>
            <CircleHelp size={14} />
            <span>{copy.accountMenu.help}</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item className="studio-menu__item" onSelect={() => navigate('/support/feedback')}>
            <Info size={14} />
            <span>{copy.accountMenu.about}</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="studio-menu__item"
            onSelect={() => dispatch(patchPreferences({ language: nextLanguage }))}
          >
            <Globe size={14} />
            <span>{copy.language.label}: {nextLanguage === 'en' ? copy.language.en : copy.language.zh}</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item className="studio-menu__item" onSelect={() => void onSignOut()}>
            <LogOut size={14} />
            <span>{copy.accountMenu.signOut}</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
