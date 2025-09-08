import React, { useMemo, useState, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { ReportForm, ReportLine } from '../components/ReportForm';
import { supabase } from '../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useReport } from '../contexts/ReportContext';

export default function StockReportScreen({ route }: any) {
  const itemIdParam = route?.params?.itemId || null;
  const [clearDialogVisible, setClearDialogVisible] = useState(false);

  const queryClient = useQueryClient();

  const {
    lines,
    note,
    totalRevenue,
    addItemToReport,
    removeLine,
    setLine,
    addLine,
    setNote,
    setTotalRevenue,
    clearReport,
  } = useReport();

  // Initialize with route param if provided
  useEffect(() => {
    if (itemIdParam && !lines.some(l => l.itemId === itemIdParam)) {
      addItemToReport(itemIdParam);
    }
  }, [itemIdParam, addItemToReport, lines]);

  // Convert useReport lines to ReportForm format
  const reportLines: ReportLine[] = useMemo(() => {
    return lines.map(l => ({
      itemId: l.itemId,
      start: l.start,
      end: l.end,
    }));
  }, [lines]);

  const setReportLines = (newLines: ReportLine[]) => {
    // Clear current lines
    clearReport();

    // Add new lines one by one using the context functions
    newLines.forEach((line, idx) => {
      if (idx === 0) {
        addLine(); // Add first line
        setLine(0, { itemId: line.itemId, start: line.start, end: line.end });
      } else {
        addLine(); // Add subsequent lines
        setLine(idx, { itemId: line.itemId, start: line.start, end: line.end });
      }
    });
  };

  const handleSave = async () => {
    if (!lines.length) {
      alert('Add at least one item');
      return;
    }
    if (lines.some(l => !l.itemId)) {
      alert('Each line needs an item');
      return;
    }
    const payload = lines.map(l => ({
      item_id: l.itemId,
      start_stock: parseInt(l.start || '0', 10),
      end_stock: parseInt(l.end || '0', 10),
    }));
    const { error } = await supabase.rpc('record_stock_report_multi', {
      p_note: note || null,
      p_total_revenue: totalRevenue ? parseFloat(totalRevenue) : null,
      p_lines: payload,
    } as any);
    if (error) {
      alert(error.message);
      return;
    }
    alert('Saved');

    // Invalidate queries to trigger re-renders in other tabs
    queryClient.invalidateQueries({ queryKey: ['reports-multi'] });
    queryClient.invalidateQueries({ queryKey: ['items'] });
    queryClient.invalidateQueries({ queryKey: ['items-basic'] });

    clearReport();
  };

  const handleClearReport = () => {
    clearReport();
    setClearDialogVisible(false);
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant='titleLarge'>Current Report</Text>
        <IconButton icon='delete' onPress={() => setClearDialogVisible(true)} />
      </View>

      <ReportForm
        lines={reportLines}
        setLines={setReportLines}
        note={note}
        setNote={setNote}
        totalRevenue={totalRevenue}
        setTotalRevenue={setTotalRevenue}
        onSave={handleSave}
        saveButtonText='Save Report'
        showAddFirstItem={true}
      />

      {/* Clear Report Confirmation Dialog */}
      <ConfirmationDialog
        visible={clearDialogVisible}
        onDismiss={() => setClearDialogVisible(false)}
        onConfirm={handleClearReport}
        title='Clear Current Report?'
        message='This will remove all items from the current report. Are you sure?'
        confirmText='Clear Report'
        cancelText='Cancel'
      />
    </ScrollView>
  );
}
