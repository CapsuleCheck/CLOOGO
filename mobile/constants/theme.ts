export const COLORS = {
  primary: '#10b981',
  primaryDark: '#059669',
  primaryLight: '#D1FAE5',
  primaryBg: '#F0FDF4',
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#64748B',
  textLight: '#94A3B8',
  border: '#E2E8F0',
  danger: '#EF4444',
  dangerBg: '#FEF2F2',
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  info: '#3B82F6',
  infoBg: '#EFF6FF',
  purple: '#7C3AED',
  purpleBg: '#F5F3FF',
};

export const STATUS = {
  open:        { label: 'Open',         bg: '#EFF6FF', text: '#1D4ED8' },
  matched:     { label: 'Matched',      bg: '#FFFBEB', text: '#92400E' },
  in_progress: { label: 'In Progress',  bg: '#F5F3FF', text: '#5B21B6' },
  completed:   { label: 'Completed',    bg: '#ECFDF5', text: '#065F46' },
  cancelled:   { label: 'Cancelled',    bg: '#F8FAFC', text: '#475569' },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const FONT = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
};

export const SHADOW = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 4,
  },
};

export const CATEGORIES = [
  'Grocery', 'Food & Drinks', 'Pharmacy',
  'Electronics', 'Documents', 'Clothing', 'Other',
];
