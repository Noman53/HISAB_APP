export const palette = {
  blue: '#2563EB', navy: '#0F172A', green: '#16A34A', red: '#EF4444', amber: '#F59E0B',
  light: { background: '#F8FAFC', card: '#FFFFFF', text: '#0F172A', muted: '#64748B', border: '#E2E8F0', soft: '#EFF6FF' },
  dark: { background: '#0F172A', card: '#1E293B', text: '#F8FAFC', muted: '#94A3B8', border: '#334155', soft: '#172554' },
} as const;

export type ThemeMode = 'system' | 'light' | 'dark';
export type ThemeColors = { background: string; card: string; text: string; muted: string; border: string; soft: string };
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { sm: 12, md: 18, lg: 26, pill: 999 } as const;
