import { ShieldCheck } from 'lucide-react';

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon"><ShieldCheck size={24} /></span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
