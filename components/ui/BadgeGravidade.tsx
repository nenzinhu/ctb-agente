import type { Enquadramento } from '@/lib/db/schema';

const CLASSE: Record<Enquadramento['gravidade'], string> = {
  leve: 'badge-leve',
  média: 'badge-media',
  grave: 'badge-grave',
  gravíssima: 'badge-gravissima',
};

/**
 * Severity pill with the same colors everywhere an infraction is shown.
 */
export default function BadgeGravidade({ gravidade }: { gravidade: string }) {
  const classe = CLASSE[gravidade as Enquadramento['gravidade']] ?? 'badge-neutral';
  return <span className={classe}>{gravidade.toUpperCase()}</span>;
}
