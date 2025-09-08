
import React, { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Card, Text, TextInput, IconButton } from 'react-native-paper';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { EditReportDialog } from '../components/EditReportDialog';

type LineRow = {
  report_id: string;
  line_id: string;
  item_id: string;
  item_name: string;
  start_stock: number;
  end_stock: number;
  sold: number;
  note: string | null;
  total_revenue: number | null;
  created_at: string;
};

export default function ReportsScreen() {
  const [from, setFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));
  const [editingReport, setEditingReport] = useState<any>(null);

  const reportsQ = useQuery({
    queryKey: ['reports-multi', from, to],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('reports_between_multi', { p_from: from, p_to: to });
      if (error) {throw error;}
      return (data ?? []) as LineRow[];
    }
  });

  const grouped = useMemo(() => {
    const rows = reportsQ.data ?? [];
    const byReport: Record<string, { created_at: string; note: string | null; total_revenue: number | null; lines: LineRow[]; }>
      = {};
    for (const r of rows) {
      if (!byReport[r.report_id]) {
        byReport[r.report_id] = { created_at: r.created_at, note: r.note, total_revenue: r.total_revenue, lines: [] };
      }
      byReport[r.report_id].lines.push(r);
    }
    const list = Object.entries(byReport)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf());
    return list;
  }, [reportsQ.data]);

  const totals = useMemo(() => {
    const rows = reportsQ.data ?? [];
    return rows.reduce((acc, r) => {
      acc.sold += r.sold;
      return acc;
    }, { sold: 0 });
  }, [reportsQ.data]);

  const handleEditReport = (report: any) => {
    setEditingReport(report);
  };

  const handleCloseEdit = () => {
    setEditingReport(null);
  };

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <Text variant="titleLarge">Reports</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput label="From (YYYY-MM-DD)" style={{ flex: 1 }} value={from} onChangeText={setFrom} />
        <TextInput label="To (YYYY-MM-DD)" style={{ flex: 1 }} value={to} onChangeText={setTo} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 8 }}>
        <Text>Total sold: {totals.sold}</Text>
      </View>

      <FlatList
        data={grouped}
        keyExtractor={(r: any) => r.id}
        renderItem={({ item }: any) => (
          <Card style={{ marginVertical: 6 }}>
            <Card.Title 
              title={item.note ? item.note : 'Report'} 
              subtitle={dayjs(item.created_at).format('YYYY-MM-DD HH:mm')}
              right={(props) => <IconButton {...props} icon="pencil" onPress={() => handleEditReport(item)} />}
            />
            <Card.Content>
              {item.lines.map((ln: LineRow) => (
                <View key={ln.line_id} style={{ marginBottom: 6 }}>
                  <Text style={{ fontWeight: '600' }}>{ln.item_name}</Text>
                  <Text>Start: {ln.start_stock}  End: {ln.end_stock}  Sold: {ln.sold}</Text>
                </View>
              ))}
              {item.total_revenue !== null && <Text>Total revenue (batch): {item.total_revenue}</Text>}
            </Card.Content>
          </Card>
        )}
      />
      
      <EditReportDialog
        visible={!!editingReport}
        onDismiss={handleCloseEdit}
        report={editingReport}
      />
    </View>
  );
}
