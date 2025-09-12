import React, { useMemo, useState } from 'react';
import { FlatList, View, Platform, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  Card,
  Text,
  IconButton,
  Button,
  Chip,
  Portal,
  Dialog,
  DataTable,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { EditReportDialog } from '../components/EditReportDialog';
import { useProfileRole } from '../hooks/useProfileRole';
import { containers, layout, spaces, chips, textAlign } from '../styles';

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
  const [viewingReport, setViewingReport] = useState<any>(null);
  const [viewingAllItems, setViewingAllItems] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<any>(null);

  const queryClient = useQueryClient();
  const { role } = useProfileRole();

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

  const deleteMutation = useMutation({
    mutationFn: async (reportId: string) => {
      console.log('Attempting to delete report:', reportId);
      const { data, error } = await supabase.rpc('delete_stock_report_batch', {
        p_report_id: reportId,
      });
      console.log('Delete response:', { data, error });
      if (error) {
        console.error('Delete error:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      console.log('Delete successful, refreshing data...');
      queryClient.invalidateQueries({ queryKey: ['reports-multi'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      setDeleteConfirmVisible(false);
      setReportToDelete(null);
    },
    onError: (error) => {
      console.error('Delete mutation failed:', error);
      alert(`Failed to delete report: ${error.message}`);
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

  const allItemsData = useMemo(() => {
    const rows = reportsQ.data ?? [];
    const itemTotals: Record<string, { name: string; sold: number }> = {};

    rows.forEach(row => {
      if (itemTotals[row.item_id]) {
        itemTotals[row.item_id].sold += row.sold;
      } else {
        itemTotals[row.item_id] = {
          name: row.item_name,
          sold: row.sold,
        };
      }
    });

    return Object.values(itemTotals).sort((a, b) => b.sold - a.sold);
  }, [reportsQ.data]);

  const handleEditReport = (report: any) => {
    setEditingReport(report);
  };

  const handleCloseEdit = () => {
    setEditingReport(null);
  };

  const handleViewReport = (report: any) => {
    setViewingReport(report);
  };

  const handleCloseView = () => {
    setViewingReport(null);
  };

  const handleViewAllItems = () => {
    setViewingAllItems(true);
  };

  const handleCloseAllItems = () => {
    setViewingAllItems(false);
  };

  const handleDeleteReport = (report: any) => {
    setReportToDelete(report);
    setDeleteConfirmVisible(true);
  };

  const handleConfirmDelete = () => {
    if (reportToDelete) {
      deleteMutation.mutate(reportToDelete.id);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmVisible(false);
    setReportToDelete(null);
  };

  const copyToClipboard = (
    data: { name: string; sold: number }[],
    report?: any,
    isAggregated?: boolean
  ) => {
    let text = '';

    if (report) {
      // Individual report copy with header
      text += `${report.note || 'Report'}\n`;
      text += `${dayjs(report.created_at).format('MMM DD, YYYY • h:mm A')}\n`;
      text += `Total stock sold: ${report.lines.reduce((sum: number, ln: LineRow) => sum + ln.sold, 0)}\n`;
      if (report.total_revenue !== null) {
        text += `Total revenue: ${report.total_revenue}\n`;
      }
      text += '\n';
      text += data.map(item => `${item.name}: ${item.sold}`).join('\n');
    } else if (isAggregated) {
      // All items copy with aggregated header
      text += `Aggregated stock report between ${dayjs(fromDate).format('MMM DD, YYYY')} and ${dayjs(toDate).format('MMM DD, YYYY')}\n`;
      text += `Total stock sold: ${totals.sold}\n\n`;
      text += data.map(item => `${item.name}: ${item.sold}`).join('\n');
    } else {
      // Fallback: just the data
      text = data.map(item => `${item.name}: ${item.sold}`).join('\n');
    }

    Clipboard.setStringAsync(text);
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
        <Text variant='titleLarge' style={textAlign.center}>
          Reports
        </Text>

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

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 8,
          }}
        >
          <Text>Total sold: {totals.sold}</Text>
          <IconButton style={{ paddingLeft: 16 }} icon='eye' onPress={handleViewAllItems} />
        </View>

        <FlatList
          data={grouped}
          keyExtractor={(r: any) => r.id}
          renderItem={({ item }: any) => (
            <Card style={{ marginVertical: 6 }}>
              <Card.Title
                title={item.note ? item.note : 'Report'}
                subtitle={dayjs(item.created_at).format('MMM DD, YYYY • h:mm A')}
                right={props => (
                  <View style={{ flexDirection: 'row' }}>
                    {role === 'admin' && (
                      <IconButton {...props} icon='delete' onPress={() => handleDeleteReport(item)} />
                    )}
                    <IconButton {...props} icon='pencil' onPress={() => handleEditReport(item)} />
                    <IconButton {...props} icon='eye' onPress={() => handleViewReport(item)} />
                  </View>
                )}
              />
              <Card.Content>
                <Text>
                  Total stock sold:{' '}
                  {item.lines.reduce((sum: number, ln: LineRow) => sum + ln.sold, 0)}
                </Text>
                {item.total_revenue !== null && <Text>Total revenue: {item.total_revenue}</Text>}
              </Card.Content>
            </Card>
          )}
        />

        <EditReportDialog
          visible={!!editingReport}
          onDismiss={handleCloseEdit}
          report={editingReport}
        />

        {/* View Report Modal */}
        <Portal>
          <Dialog visible={!!viewingReport} onDismiss={handleCloseView}>
            <Dialog.Content>
              <DataTable>
                <DataTable.Header>
                  <DataTable.Title>Item</DataTable.Title>
                  <DataTable.Title numeric>Amount Sold</DataTable.Title>
                </DataTable.Header>
                {viewingReport?.lines?.map((ln: LineRow) => (
                  <DataTable.Row key={ln.line_id}>
                    <DataTable.Cell>{ln.item_name}</DataTable.Cell>
                    <DataTable.Cell numeric>{ln.sold}</DataTable.Cell>
                  </DataTable.Row>
                ))}
              </DataTable>
            </Dialog.Content>
            <Dialog.Actions>
              <Button
                onPress={() =>
                  copyToClipboard(
                    viewingReport?.lines?.map((ln: LineRow) => ({
                      name: ln.item_name,
                      sold: ln.sold,
                    })) || [],
                    viewingReport
                  )
                }
              >
                Copy
              </Button>
              <Button onPress={handleCloseView}>Close</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

        {/* View All Items Modal */}
        <Portal>
          <Dialog visible={viewingAllItems} onDismiss={handleCloseAllItems}>
            <Dialog.Content>
              <DataTable>
                <DataTable.Header>
                  <DataTable.Title>Item</DataTable.Title>
                  <DataTable.Title numeric>Amount Sold</DataTable.Title>
                </DataTable.Header>
                {allItemsData.map((item, index) => (
                  <DataTable.Row key={`${item.name}-${index}`}>
                    <DataTable.Cell>{item.name}</DataTable.Cell>
                    <DataTable.Cell numeric>{item.sold}</DataTable.Cell>
                  </DataTable.Row>
                ))}
              </DataTable>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => copyToClipboard(allItemsData, undefined, true)}>Copy</Button>
              <Button onPress={handleCloseAllItems}>Close</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

        {/* Delete Confirmation Dialog */}
        <Portal>
          <Dialog visible={deleteConfirmVisible} onDismiss={handleCancelDelete}>
            <Dialog.Title>Delete Report</Dialog.Title>
            <Dialog.Content>
              <Text>
                Are you sure you want to delete this report? This will restore the stock levels and
                cannot be undone.
              </Text>
              {reportToDelete && (
                <Text style={{ marginTop: 8, fontWeight: 'bold' }}>
                  "{reportToDelete.note || 'Report'}" -{' '}
                  {dayjs(reportToDelete.created_at).format('MMM DD, YYYY • h:mm A')}
                </Text>
              )}
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={handleCancelDelete}>Cancel</Button>
              <Button
                onPress={handleConfirmDelete}
                loading={deleteMutation.isPending}
                disabled={deleteMutation.isPending}
              >
                Delete
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

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
