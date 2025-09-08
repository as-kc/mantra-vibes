import { StyleSheet } from 'react-native';

// Common spacing values
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

// Common dimensions
export const dimensions = {
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  borderWidth: {
    thin: 1,
    medium: 2,
    thick: 3,
  },
} as const;

// Layout styles
export const layout = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  flexRow: {
    flexDirection: 'row',
  },
  flexColumn: {
    flexDirection: 'column',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerVertical: {
    justifyContent: 'center',
  },
  centerHorizontal: {
    alignItems: 'center',
  },
  spaceBetween: {
    justifyContent: 'space-between',
  },
  spaceAround: {
    justifyContent: 'space-around',
  },
  flexWrap: {
    flexWrap: 'wrap',
  },
});

// Spacing styles
export const spaces = StyleSheet.create({
  paddingXS: { padding: spacing.xs },
  paddingSM: { padding: spacing.sm },
  paddingMD: { padding: spacing.md },
  paddingLG: { padding: spacing.lg },
  paddingXL: { padding: spacing.xl },
  paddingXXL: { padding: spacing.xxl },
  
  marginXS: { margin: spacing.xs },
  marginSM: { margin: spacing.sm },
  marginMD: { margin: spacing.md },
  marginLG: { margin: spacing.lg },
  marginXL: { margin: spacing.xl },
  marginXXL: { margin: spacing.xxl },
  
  marginTopXS: { marginTop: spacing.xs },
  marginTopSM: { marginTop: spacing.sm },
  marginTopMD: { marginTop: spacing.md },
  marginTopLG: { marginTop: spacing.lg },
  marginTopXL: { marginTop: spacing.xl },
  marginTopXXL: { marginTop: spacing.xxl },
  
  marginBottomXS: { marginBottom: spacing.xs },
  marginBottomSM: { marginBottom: spacing.sm },
  marginBottomMD: { marginBottom: spacing.md },
  marginBottomLG: { marginTop: spacing.lg },
  marginBottomXL: { marginBottom: spacing.xl },
  marginBottomXXL: { marginBottom: spacing.xxl },
  
  gapXS: { gap: spacing.xs },
  gapSM: { gap: spacing.sm },
  gapMD: { gap: spacing.md },
  gapLG: { gap: spacing.lg },
  gapXL: { gap: spacing.xl },
  gapXXL: { gap: spacing.xxl },
});

// Common container styles
export const containers = StyleSheet.create({
  screen: {
    flex: 1,
    padding: spacing.lg,
  },
  screenWithoutPadding: {
    flex: 1,
  },
  safeAreaScreen: {
    flex: 1,
  },
  section: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  card: {
    margin: spacing.md,
  },
  cardContent: {
    padding: spacing.lg,
  },
  fabPosition: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
  },
});

// Text alignment styles
export const textAlign = StyleSheet.create({
  center: { textAlign: 'center' },
  left: { textAlign: 'left' },
  right: { textAlign: 'right' },
  justify: { textAlign: 'justify' },
});

// Common form styles
export const forms = StyleSheet.create({
  input: {
    marginBottom: spacing.sm,
  },
  inputGroup: {
    gap: spacing.sm,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});

// Tag/chip container styles
export const chips = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});