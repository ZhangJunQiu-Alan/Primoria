import { useEffect, useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { BadgeCheck, CircleHelp, Info, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ViewerAuthUser } from '@/features/auth/authSlice';
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
  const navigate = useNavigate();
  const [profileSummary, setProfileSummary] = useState<DashboardProfileSummary | null>(null);

  useEffect(() => {
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
  }, [user.id]);

  const displayName = getDisplayName(user.email, profileSummary?.username);
  const avatarInitial = (displayName.trim()[0] ?? 'A').toUpperCase();
  const avatarUrl = profileSummary?.avatarUrl?.trim() ?? '';

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={buttonClassName}
          aria-label="Open account menu"
          title={title ?? user.email ?? 'Author account'}
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
            <span>Settings</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item className="studio-menu__item" onSelect={() => navigate('/support/help')}>
            <CircleHelp size={14} />
            <span>Help</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item className="studio-menu__item" onSelect={() => navigate('/support/feedback')}>
            <Info size={14} />
            <span>About</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item className="studio-menu__item" onSelect={() => void onSignOut()}>
            <LogOut size={14} />
            <span>Sign out</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
