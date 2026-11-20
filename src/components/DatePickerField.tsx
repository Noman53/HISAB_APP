import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleProp, StyleSheet, View, ViewStyle, useWindowDimensions } from 'react-native';
import { AppText } from '@/components/AppText';
import { useLanguage } from '@/i18n/LanguageProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { palette, radius, spacing } from '@/theme/tokens';
import { dateOnlyToLocalDate, getMonthCalendarDays, localDateToDateOnly } from './date-picker-utils';
import { isValidDateOnly } from '@/finance/money';

type DatePickerFieldProps = {
  value: string;
  onChange: (value: string) => void;
  accessibilityLabel: string;
  allowClear?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

const weekReference = new Date(2023, 0, 1, 12);

export function DatePickerField({ value, onChange, accessibilityLabel, allowClear = false, compact = false, style }: DatePickerFieldProps) {
  const { colors } = useTheme();
  const { language, translate } = useLanguage();
  const { height, width } = useWindowDimensions();
  const locale = language === 'bn' ? 'bn-BD' : 'en-US';
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => dateOnlyToLocalDate(value));
  const selectedKey = isValidDateOnly(value) ? value : '';
  const selectedDate = selectedKey ? dateOnlyToLocalDate(selectedKey) : null;
  const displayFormatter = useMemo(() => new Intl.DateTimeFormat(locale, compact
    ? { year: 'numeric', month: '2-digit', day: '2-digit' }
    : { year: 'numeric', month: 'short', day: 'numeric' }), [compact, locale]);
  const monthFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }), [locale]);
  const weekdayFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'short' }), [locale]);
  const dayFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), [locale]);
  const displayValue = selectedDate ? displayFormatter.format(selectedDate) : translate('Select date');
  const monthLabel = monthFormatter.format(visibleMonth);
  const todayKey = localDateToDateOnly(new Date());
  const calendarDays = useMemo(() => getMonthCalendarDays(visibleMonth), [visibleMonth]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekReference);
    day.setDate(weekReference.getDate() + index);
    return weekdayFormatter.format(day);
  }), [weekdayFormatter]);

  function showPicker() {
    setVisibleMonth(dateOnlyToLocalDate(value));
    setOpen(true);
  }

  function selectDate(date: Date) {
    onChange(localDateToDateOnly(date));
    setOpen(false);
  }

  function shiftMonth(amount: number) {
    setVisibleMonth(current => {
      const next = new Date(current);
      next.setDate(1);
      next.setMonth(next.getMonth() + amount);
      return next;
    });
  }

  return <>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${translate(accessibilityLabel)}${displayValue ? `: ${displayValue}` : ''}`}
      accessibilityHint={translate('Select date')}
      accessibilityState={{ expanded: open }}
      onPress={showPicker}
      style={[styles.field, compact && styles.compactField, { backgroundColor: colors.card, borderColor: colors.border }, style]}
    >
      <Ionicons name="calendar-outline" size={compact ? 16 : 18} color={palette.blue} />
      <AppText numberOfLines={1} style={[styles.fieldText, compact && styles.compactFieldText, { color: selectedDate ? colors.text : colors.muted }]}>
        {displayValue}
      </AppText>
      <Ionicons name="chevron-down" size={compact ? 14 : 16} color={colors.muted} />
    </Pressable>

    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={styles.overlay}>
        <Pressable accessibilityRole="button" accessibilityLabel={translate('Cancel')} onPress={() => setOpen(false)} style={StyleSheet.absoluteFill} />
        <View style={[styles.dialog, { backgroundColor: colors.card, maxHeight: height * 0.9, width: Math.min(width - spacing.lg * 2, 420) }]}>
          <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.dialogContent}>
            <View style={styles.dialogHeading}>
              <AppText style={styles.dialogTitle} localized>Select date</AppText>
              <Pressable accessibilityRole="button" accessibilityLabel={translate('Cancel')} onPress={() => setOpen(false)} hitSlop={8} style={styles.closeButton}>
                <Ionicons name="close" size={21} color={colors.muted} />
              </Pressable>
            </View>

            <View style={styles.monthRow}>
              <Pressable accessibilityRole="button" accessibilityLabel={translate('Previous month')} onPress={() => shiftMonth(-1)} style={styles.monthButton}>
                <Ionicons name="chevron-back" size={20} color={colors.text} />
              </Pressable>
              <AppText style={styles.monthLabel}>{monthLabel}</AppText>
              <Pressable accessibilityRole="button" accessibilityLabel={translate('Next month')} onPress={() => shiftMonth(1)} style={styles.monthButton}>
                <Ionicons name="chevron-forward" size={20} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {weekDays.map((day, index) => <AppText key={index} style={[styles.weekDay, { color: colors.muted }]}>{day}</AppText>)}
            </View>

            {Array.from({ length: 6 }, (_, weekIndex) => <View key={weekIndex} style={styles.weekRow}>
              {calendarDays.slice(weekIndex * 7, weekIndex * 7 + 7).map((day, dayIndex) => {
                if (!day) return <View key={dayIndex} style={styles.dayCell} />;
                const dayKey = localDateToDateOnly(day);
                const selected = dayKey === selectedKey;
                const today = dayKey === todayKey;
                const dayLabel = dayFormatter.format(day);
                return <View key={dayIndex} style={styles.dayCell}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={dayLabel}
                    accessibilityState={{ selected }}
                    onPress={() => selectDate(day)}
                    style={[styles.dayButton, today && { borderColor: palette.blue, borderWidth: 1 }, selected && { backgroundColor: palette.blue, borderColor: palette.blue }]}
                  >
                    <AppText style={[styles.dayText, { color: selected ? '#FFFFFF' : colors.text }]}>{day.getDate().toLocaleString(locale)}</AppText>
                  </Pressable>
                </View>;
              })}
            </View>)}

            <View style={[styles.actions, { borderTopColor: colors.border }]}>
              <Pressable accessibilityRole="button" onPress={() => selectDate(dateOnlyToLocalDate(''))} style={styles.actionButton}>
                <AppText style={styles.actionText} localized>Today</AppText>
              </Pressable>
              {allowClear && value ? <Pressable accessibilityRole="button" onPress={() => { onChange(''); setOpen(false); }} style={styles.actionButton}>
                <AppText style={[styles.actionText, { color: palette.red }]} localized>Clear date</AppText>
              </Pressable> : null}
              <View style={styles.actionSpacer} />
              <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={styles.actionButton}>
                <AppText style={[styles.actionText, { color: colors.muted }]} localized>Cancel</AppText>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  field: { minHeight: 50, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  compactField: { minHeight: 42, paddingHorizontal: 9, gap: 5 },
  fieldText: { flex: 1, minWidth: 0, fontSize: 14 },
  compactFieldText: { fontSize: 11 },
  overlay: { flex: 1, backgroundColor: '#00000066', justifyContent: 'center', alignItems: 'center', padding: spacing.md },
  dialog: { borderRadius: radius.lg, overflow: 'hidden', elevation: 12, shadowColor: '#000000', shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  dialogContent: { padding: spacing.md },
  dialogHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  dialogTitle: { fontSize: 17, fontWeight: '700' },
  closeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  monthButton: { width: 42, height: 42, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontSize: 15, fontWeight: '700', textTransform: 'capitalize' },
  weekRow: { flexDirection: 'row', alignItems: 'center' },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', paddingVertical: 8 },
  dayCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dayButton: { width: '100%', maxWidth: 48, minHeight: 34, aspectRatio: 1, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 13, fontWeight: '500' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 10, paddingTop: 10 },
  actionButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 10 },
  actionText: { color: palette.blue, fontSize: 12, fontWeight: '700' },
  actionSpacer: { flex: 1 },
});
