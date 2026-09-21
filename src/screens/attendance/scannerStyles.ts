import { StyleSheet } from 'react-native';

export const scannerStyles = StyleSheet.create({
  scannerSafeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  overlayLayer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  scannerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  scannerControlBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  scannerTorchActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#fbbf24',
  },
  scannerScreenTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  viewfinderCenterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinderFrame: {
    width: 260,
    height: 260,
    position: 'relative',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
  },
  reticleCorner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#c4b5fd',
  },
  cornerTopLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10,
  },
  cornerTopRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10,
  },
  cornerBottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10,
  },
  cornerBottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10,
  },
  viewfinderHint: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 18,
    textAlign: 'center',
  },
  scannerBottomHUD: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  feedbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    marginBottom: 12,
  },
  feedbackSuccess: {
    backgroundColor: 'rgba(6, 78, 59, 0.95)',
    borderColor: '#10b981',
  },
  feedbackDuplicate: {
    backgroundColor: 'rgba(120, 53, 15, 0.95)',
    borderColor: '#f59e0b',
  },
  feedbackError: {
    backgroundColor: 'rgba(127, 29, 29, 0.95)',
    borderColor: '#ef4444',
  },
  feedbackIconWrap: {
    marginRight: 10,
  },
  feedbackTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  feedbackMessage: {
    fontSize: 12,
    color: '#e2e8f0',
    marginTop: 2,
  },
  scannerDoneBtn: {
    backgroundColor: '#7c3aed',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerDoneBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
});
