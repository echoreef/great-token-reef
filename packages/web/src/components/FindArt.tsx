import { useId, useMemo } from 'react';
import { findSvg } from '@gtr/shared';

export function FindArt({ id, className, title }: { id: string; className?: string; title?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const svg = useMemo(() => findSvg(id, uid), [id, uid]);
  return <div className={className} title={title} dangerouslySetInnerHTML={{ __html: svg }} />;
}
