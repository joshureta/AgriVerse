import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFD9',
  },
  background: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  gradientLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
  },
  logoContainer: {
    marginTop: 12,
    marginBottom: 26,
    alignItems: 'flex-start',
  },
  logoContainerCompact: {
    marginTop: 6,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  brandLogo: {
    height: 72,
    aspectRatio: 1419 / 1108,
  },
  brandLogoCompact: {
    height: 56,
    aspectRatio: 1419 / 1108,
  },
  headlineWrap: {
    gap: 3,
  },
  headlineLine1: {
    fontSize: 29,
    fontWeight: '900',
    color: '#A15E22',
    letterSpacing: -0.5,
    lineHeight: 33,
    textTransform: 'uppercase',
  },
  headlineLine1Compact: {
    fontSize: 24,
    lineHeight: 28,
  },
  headlineLine2Text: {
    fontSize: 29,
    fontWeight: '900',
    color: '#216023',
    letterSpacing: -0.5,
    lineHeight: 33,
    textTransform: 'uppercase',
  },
  headlineLine2TextCompact: {
    fontSize: 24,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 14.5,
    fontWeight: '500',
    color: '#384239',
    lineHeight: 21,
    marginTop: 14,
    maxWidth: 280,
    letterSpacing: -0.1,
  },
  subtitleCompact: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
    maxWidth: 260,
  },
  buttonContainer: {
    marginTop: 'auto',
    alignItems: 'center',
    gap: 14,
  },
  startButton: {
    width: '100%',
    height: 58,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#185C35',
    shadowColor: '#185C35',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 8,
  },
  startButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
