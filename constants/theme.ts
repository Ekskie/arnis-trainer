/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const MartialTheme = {
  colors: {
    // Warm light background & surfaces (Duolingo-style warm paper / bamboo feel)
    background: '#FAF8F3',          // Warm cream / off-white
    backgroundSecondary: '#F3EFE6', // Soft sand / tinted surface
    card: '#FFFFFF',                // Clean white cards/nodes
    cardElevated: '#FFFFFF',
    cardBorder: '#E5E0D3',          // Warm subtle border
    cardBorderHighlight: '#D4CEBE',
    
    // Core Brand Colors
    primary: '#15803D',             // Energetic deep forest green
    primaryDark: '#166534',         // 3D bottom border for tactile buttons
    primaryLight: '#22C55E',        // Bright lively green
    primaryMuted: '#DCFCE7',        // Pastel green chip/badge
    
    // Secondary & Golden Bamboo
    bamboo: '#F59E0B',              // Golden bamboo / warm amber
    bambooLight: '#FBBF24',
    bambooDark: '#D97706',          // 3D border for bamboo buttons
    bambooMuted: '#FEF3C7',
    gold: '#F59E0B',
    goldLight: '#FBBF24',
    goldDark: '#D97706',
    
    // Accents (Philippine Mango & Crimson / Flame)
    flame: '#EA580C',               // Warm Philippine mango / flame orange for streaks
    flameDark: '#C2410C',
    flameMuted: '#FFEDD5',
    crimson: '#DC2626',             // Warm traditional Filipino red
    crimsonLight: '#EF4444',
    crimsonDark: '#B91C1C',
    crimsonMuted: '#FEE2E2',
    
    amber: '#F59E0B',
    amberMuted: '#FEF3C7',
    
    // Typography
    text: '#1C2721',                // Dark charcoal / warm black
    textSecondary: '#4B5852',       // Medium slate/charcoal
    textMuted: '#7D8C84',           // Soft sage-gray
    textInverse: '#FFFFFF',         // White text on colored buttons
    
    // Tactile & 3D Shadow Borders
    border: '#E5E0D3',              // Subtle warm border
    borderSubtle: '#EFEAE0',
    border3D: '#D5CEBF',            // Physical 3D bottom edge for cards/nodes
    border3DPrimary: '#14532D',     // 3D pressable bottom edge for primary buttons
    border3DGold: '#B45309',        // 3D pressable bottom edge for gold buttons
    divider: '#EBE5D8',
    
    // Gamification Accents
    xpPurple: '#8B5CF6',
    xpPurpleMuted: '#F3E8FF',
    streakFlame: '#EA580C',
    heartRed: '#EF4444',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    hero: 32,
  },
  radii: {
    sm: 8,
    md: 12,
    lg: 18,
    xl: 24,
    full: 9999,
  },
};

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: MartialTheme.colors.primary,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: MartialTheme.colors.primary,
  },
  dark: {
    text: MartialTheme.colors.text,
    background: MartialTheme.colors.background,
    tint: MartialTheme.colors.primary,
    icon: MartialTheme.colors.textSecondary,
    tabIconDefault: '#64748B',
    tabIconSelected: MartialTheme.colors.bamboo,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
