import { useState } from 'react';
import { introSeen, rememberIntroSeen } from '@/components/introPreference';

const SESSION_NOTICE = 'The intro may show again next time you open the app.';

export interface FirstRunIntroState { open: boolean; notice: string; show: () => void; close: () => void }

/** Opens once when no saved choice exists; a refused save closes it for this session only. */
export function useFirstRunIntro(): FirstRunIntroState {
  const [open, setOpen] = useState(() => !introSeen());
  const [notice, setNotice] = useState('');
  return {
    open, notice,
    show: () => setOpen(true),
    close: () => { setNotice(rememberIntroSeen() ? '' : SESSION_NOTICE); setOpen(false); },
  };
}
