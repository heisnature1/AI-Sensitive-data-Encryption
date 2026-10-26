import {
  Asterisk,
  Bot,
  Braces,
  CircleDot,
  Search,
  Sparkles,
  Star,
  type LucideIcon,
} from 'lucide-react';
import { DESTINATIONS } from '../lib/storage';

const ICONS: Record<string, LucideIcon> = {
  chatgpt: Bot,
  claude: Asterisk,
  gemini: Star,
  copilot: Sparkles,
  perplexity: Search,
  poe: CircleDot,
  grok: Braces,
  playground: Sparkles,
};

interface DestinationIconProps {
  id: string;
  size?: 'small' | 'medium' | 'large';
}

export function DestinationIcon({ id, size = 'medium' }: DestinationIconProps) {
  const destination = DESTINATIONS.find((item) => item.id === id);
  const Icon = ICONS[id] ?? Sparkles;
  const color = destination?.color ?? '#1d7353';
  const background = destination?.softColor ?? '#e9f4ee';
  const pixels = size === 'small' ? 30 : size === 'large' ? 46 : 36;
  const iconSize = size === 'small' ? 15 : size === 'large' ? 22 : 18;
  return (
    <span
      className="destination-icon"
      style={{ width: pixels, height: pixels, color, background, borderRadius: pixels * 0.3 }}
      aria-hidden="true"
    >
      <Icon size={iconSize} strokeWidth={1.9} />
    </span>
  );
}
