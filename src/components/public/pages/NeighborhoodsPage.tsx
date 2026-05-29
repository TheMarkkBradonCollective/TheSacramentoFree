import { MapPin } from 'lucide-react';
import { SACRAMENTO_NEIGHBORHOODS } from '../../../types';
import PublicCard from '../PublicCard';
import PublicPageShell from '../PublicPageShell';

export default function NeighborhoodsPage() {
  return (
    <PublicPageShell
      title="Sacramento neighborhoods"
      subtitle="Neighbors from across the city and surrounding areas are welcome."
    >
      <PublicCard>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SACRAMENTO_NEIGHBORHOODS.map((area) => (
            <div
              key={area}
              className="px-3 py-2.5 rounded-xl bg-inset border border-app text-xs font-bold text-app flex items-center gap-1.5"
            >
              <MapPin className="w-3 h-3 text-accent shrink-0" />
              {area}
            </div>
          ))}
          <div className="px-3 py-2.5 rounded-xl bg-inset border border-app text-xs font-bold text-muted col-span-2 sm:col-span-1">
            And surrounding areas
          </div>
        </div>
      </PublicCard>
    </PublicPageShell>
  );
}
