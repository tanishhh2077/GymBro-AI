import { createContext, useContext, useEffect, useId } from 'react';

export const DISCARD_MESSAGE = 'Discard unsaved changes?';

/** Forms report typed-but-unsaved input here so App can ask before a view change unmounts them. */
export interface UnsavedChanges { readonly forms: Set<string> }
export function createUnsavedChanges(): UnsavedChanges { return { forms: new Set() }; }
export const UnsavedChangesContext = createContext<UnsavedChanges | null>(null);

/** True when nothing is dirty or the user agrees to lose the typed input. */
export function confirmDiscard(dirty: boolean): boolean {
  return !dirty || window.confirm(DISCARD_MESSAGE);
}

/** Registers this form while it differs from its saved values; unmounting or saving clears it. */
export function useUnsavedChanges(dirty: boolean) {
  const registry = useContext(UnsavedChangesContext);
  const id = useId();
  useEffect(() => {
    if (!registry || !dirty) return;
    registry.forms.add(id);
    return () => { registry.forms.delete(id); };
  }, [registry, dirty, id]);
}

/** For actions inside a view (such as Finish) that would also drop other forms' typed input. */
export function useConfirmLeave() {
  const registry = useContext(UnsavedChangesContext);
  return () => confirmDiscard(!!registry?.forms.size);
}
