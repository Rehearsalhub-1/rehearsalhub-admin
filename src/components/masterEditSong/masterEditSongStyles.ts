import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#ffffff',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  cancelBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  cancelBtnText: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  hqIndicator: {
    backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#ddd6fe',
    borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1,
  },
  hqIndicatorText: { fontSize: 9, fontWeight: '800', color: '#7c3aed' },
  saveBtn: { backgroundColor: '#7c3aed', paddingHorizontal: 16, paddingVertical: 7, borderRadius: 10 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },

  tabsRow: {
    flexDirection: 'row', backgroundColor: '#ffffff', paddingHorizontal: 12,
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 4,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 7, borderRadius: 8, backgroundColor: '#f8fafc',
  },
  tabBtnActive: { backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#ddd6fe' },
  tabBtnText: { fontSize: 10.5, fontWeight: '600', color: '#64748b' },
  tabBtnTextActive: { color: '#7c3aed', fontWeight: '800' },

  content: { padding: 16, gap: 14 },
  tabSection: { gap: 14 },
  card: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0', gap: 12,
  },
  cardSectionTitle: { fontSize: 13.5, fontWeight: '800', color: '#0f172a' },
  inputGroup: { gap: 4 },
  inputRow: { flexDirection: 'row', gap: 10 },
  label: { fontSize: 10, fontWeight: '800', color: '#64748b', letterSpacing: 0.5 },
  labelWithAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },

  input: {
    backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1,
    borderColor: '#e2e8f0', paddingHorizontal: 12, height: 40,
    fontSize: 13.5, color: '#0f172a',
  },
  multilineInput: {
    backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1,
    borderColor: '#e2e8f0', padding: 12, height: 150,
    fontSize: 13.5, color: '#0f172a', lineHeight: 20,
  },
  addCategoryPill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f3ff',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    borderWidth: 1, borderColor: '#ddd6fe',
  },
  addCategoryPillText: { fontSize: 10.5, fontWeight: '700', color: '#7c3aed' },

  inlineNewCatRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  inlineNewCatInput: {
    flex: 1, backgroundColor: '#ffffff', borderRadius: 8, borderWidth: 1,
    borderColor: '#7c3aed', paddingHorizontal: 10, height: 34,
    fontSize: 12.5, color: '#0f172a',
  },
  inlineAddCatBtn: {
    backgroundColor: '#7c3aed', paddingHorizontal: 12, height: 34,
    borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  inlineAddCatBtnText: { fontSize: 12, fontWeight: '700', color: '#ffffff' },
  inlineCancelCatBtn: { padding: 6 },

  categoryScroll: { flexDirection: 'row', gap: 6, paddingVertical: 4 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  categoryChipActive: { backgroundColor: '#f5f3ff', borderColor: '#7c3aed' },
  categoryChipText: { fontSize: 11.5, fontWeight: '600', color: '#64748b' },
  categoryChipTextActive: { color: '#7c3aed', fontWeight: '800' },

  keyScroll: { flexDirection: 'row', gap: 6, paddingVertical: 2 },
  keyPill: {
    width: 36, height: 32, borderRadius: 8, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0',
  },
  keyPillActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  keyPillText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  keyPillTextActive: { color: '#ffffff' },

  pickMediaPill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f3ff',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    borderWidth: 1, borderColor: '#ddd6fe',
  },
  pickMediaPillText: { fontSize: 10.5, fontWeight: '700', color: '#7c3aed' },
  stemInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  testPlayBtn: {
    width: 38, height: 40, borderRadius: 10, backgroundColor: '#f5f3ff',
    borderWidth: 1, borderColor: '#ddd6fe', alignItems: 'center', justifyContent: 'center',
  },
  testPlayBtnActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  stemFieldBlock: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 4 },
  stemHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  stemDot: { width: 8, height: 8, borderRadius: 4 },
  stemFieldLabel: { fontSize: 11, fontWeight: '700', color: '#334155' },
  smallPickBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f3ff',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#ddd6fe',
  },
  smallPickBtnText: { fontSize: 10, fontWeight: '700', color: '#7c3aed' },

  accessToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  accessTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  accessSubtitle: { fontSize: 11.5, color: '#64748b', lineHeight: 16 },
  hqInfoBox: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#f5f3ff',
    borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e9d5ff', marginTop: 4,
  },
  hqInfoBoxTitle: { fontSize: 12, fontWeight: '800', color: '#7c3aed', marginBottom: 2 },
  hqInfoBoxText: { fontSize: 11, color: '#6b21a8', lineHeight: 15 },
});
