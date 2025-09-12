import React, { useMemo, useState } from 'react';
import { FlatList, View, Platform, StyleSheet } from 'react-native';
import { Card, Text, IconButton, Button, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { EditReportDialog } from '../components/EditReportDialog';
import { containers, layout, spaces, chips } from '../styles';

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
  const [fromDate, setFromDate] = useState(dayjs().startOf('month').toDate());
  const [toDate, setToDate] = useState(dayjs().endOf('month').toDate());
  const [editingReport, setEditingReport] = useState<any>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // Convert dates to string format for API calls
  const from = dayjs(fromDate).format('YYYY-MM-DD');
  const to = dayjs(toDate).format('YYYY-MM-DD');

  const reportsQ = useQuery({
    queryKey: ['reports-multi', from, to],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('reports_between_multi', {
        p_from: from,
        p_to: to,
      });
      if (error) {
        throw error;
      }
      return (data ?? []) as LineRow[];
    },
  });

  const grouped = useMemo(() => {
    const rows = reportsQ.data ?? [];
    const byReport: Record<
      string,
      { created_at: string; note: string | null; total_revenue: number | null; lines: LineRow[] }
    > = {};
    for (const r of rows) {
      if (!byReport[r.report_id]) {
        byReport[r.report_id] = {
          created_at: r.created_at,
          note: r.note,
          total_revenue: r.total_revenue,
          lines: [],
        };
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
    return rows.reduce(
      (acc, r) => {
        acc.sold += r.sold;
        return acc;
      },
      { sold: 0 }
    );
  }, [reportsQ.data]);

  const handleEditReport = (report: any) => {
    setEditingReport(report);
  };

  const handleCloseEdit = () => {
    setEditingReport(null);
  };

  const handleDateChange = (event: any, selectedDate: Date | undefined, isFromDate: boolean) => {
    if (selectedDate) {
      if (isFromDate) {
        setFromDate(selectedDate);
        setShowFromPicker(false);
      } else {
        setToDate(selectedDate);
        setShowToPicker(false);
      }
    } else {
      setShowFromPicker(false);
      setShowToPicker(false);
    }
  };

  const setDateRange = (range: 'week' | 'month' | 'year') => {
    const now = dayjs();
    switch (range) {
      case 'week':
        setFromDate(now.subtract(7, 'days').startOf('day').toDate());
        setToDate(now.endOf('day').toDate());
        break;
      case 'month':
        setFromDate(now.subtract(1, 'month').startOf('day').toDate());
        setToDate(now.endOf('day').toDate());
        break;
      case 'year':
        setFromDate(now.subtract(1, 'year').startOf('day').toDate());
        setToDate(now.endOf('day').toDate());
        break;
    }
  };

  return (
    <SafeAreaView style={containers.safeAreaScreen}>
      <View style={containers.screen}>
        <Text variant='titleLarge'>Reports</Text>

        {/* Preset Date Range Buttons */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', marginVertical: 8 }}>
          <Chip onPress={() => setDateRange('week')} textStyle={{ textAlign: 'center' }}>
            Past Week
          </Chip>
          <Chip onPress={() => setDateRange('month')} textStyle={{ textAlign: 'center' }}>
            Past Month
          </Chip>
          <Chip onPress={() => setDateRange('year')} textStyle={{ textAlign: 'center' }}>
            Past Year
          </Chip>
        </View>

        {/* Date Picker Buttons */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <Button
            mode='outlined'
            onPress={() => setShowFromPicker(true)}
            style={{ flex: 1 }}
            contentStyle={{ paddingVertical: 8 }}
          >
            From: {dayjs(fromDate).format('MMM DD, YYYY')}
          </Button>
          <Button
            mode='outlined'
            onPress={() => setShowToPicker(true)}
            style={{ flex: 1 }}
            contentStyle={{ paddingVertical: 8 }}
          >
            To: {dayjs(toDate).format('MMM DD, YYYY')}
          </Button>
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
                right={props => (
                  <IconButton {...props} icon='pencil' onPress={() => handleEditReport(item)} />
                )}
              />
              <Card.Content>
                {item.lines.map((ln: LineRow) => (
                  <View key={ln.line_id} style={{ marginBottom: 6 }}>
                    <Text style={{ fontWeight: '600' }}>{ln.item_name}</Text>
                    <Text>
                      Start: {ln.start_stock} End: {ln.end_stock} Sold: {ln.sold}
                    </Text>
                  </View>
                ))}
                {item.total_revenue !== null && (
                  <Text>Total revenue (batch): {item.total_revenue}</Text>
                )}
              </Card.Content>
            </Card>
          )}
        />

        <EditReportDialog
          visible={!!editingReport}
          onDismiss={handleCloseEdit}
          report={editingReport}
        />

        {/* Date Pickers */}
        {showFromPicker && (
          <DateTimePicker
            value={fromDate}
            mode='date'
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => handleDateChange(event, selectedDate, true)}
          />
        )}

        {showToPicker && (
          <DateTimePicker
            value={toDate}
            mode='date'
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => handleDateChange(event, selectedDate, false)}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
