import { Utensils, Car, ShoppingBag, Film, HeartPulse, Home, Zap, Plane, BookOpen, MoreHorizontal, Circle, Coffee, Music, Gamepad2, Gift, Briefcase, DollarSign, TableProperties as LucideProps } from 'lucide-react';

const iconMap: Record<string, React.ComponentType<LucideProps>> = {
  utensils: Utensils,
  car: Car,
  'shopping-bag': ShoppingBag,
  film: Film,
  'heart-pulse': HeartPulse,
  home: Home,
  zap: Zap,
  plane: Plane,
  'book-open': BookOpen,
  'more-horizontal': MoreHorizontal,
  circle: Circle,
  coffee: Coffee,
  music: Music,
  gamepad: Gamepad2,
  gift: Gift,
  briefcase: Briefcase,
  dollar: DollarSign,
};

type Props = { icon: string; size?: number; className?: string; color?: string };

export default function CategoryIcon({ icon, size = 16, className = '', color }: Props) {
  const Icon = iconMap[icon] || Circle;
  return <Icon size={size} className={className} color={color} />;
}
