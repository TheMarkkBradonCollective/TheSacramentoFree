import {
  Award,
  Calendar,
  CheckCircle,
  Circle,
  Compass,
  Crown,
  Gift,
  HandHeart,
  Heart,
  HeartHandshake,
  Infinity,
  Layers,
  Link,
  Medal,
  Megaphone,
  MessageCircle,
  MessagesSquare,
  Package,
  PartyPopper,
  PenLine,
  PlusCircle,
  Radio,
  Repeat,
  Shield,
  Sparkles,
  Star,
  ThumbsUp,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  award: Award,
  calendar: Calendar,
  'check-circle': CheckCircle,
  circle: Circle,
  compass: Compass,
  crown: Crown,
  gift: Gift,
  'hand-heart': HandHeart,
  heart: Heart,
  'heart-handshake': HeartHandshake,
  infinity: Infinity,
  layers: Layers,
  link: Link,
  medal: Medal,
  megaphone: Megaphone,
  'message-circle': MessageCircle,
  'messages-square': MessagesSquare,
  package: Package,
  'party-popper': PartyPopper,
  'pen-line': PenLine,
  'plus-circle': PlusCircle,
  radio: Radio,
  repeat: Repeat,
  shield: Shield,
  sparkles: Sparkles,
  star: Star,
  'thumbs-up': ThumbsUp,
  'user-check': UserCheck,
  users: Users,
};

interface AwardIconProps {
  name: string;
  className?: string;
}

export default function AwardIcon({ name, className = 'w-5 h-5' }: AwardIconProps) {
  const Icon = ICON_MAP[name] || Award;
  return <Icon className={className} aria-hidden />;
}
