import React, { useState, useEffect } from 'react';
import { ScrollView } from 'react-native';
import { 
  Portal, 
  Dialog, 
  Button, 
} from 'react-native-paper';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { ReportForm, ReportLine } from './ReportForm';

type EditReportDialogProps = {
  visible: boolean;
  onDismiss: () => void;
  report: any;
};

export const EditReportDialog: React.FC<EditReportDialogProps> = ({
  visible,
  onDismiss,
  report,
}) => {
  const [lines, setLines] = useState<ReportLine[]>([]);
  const [note, setNote] = useState('');
  const [totalRevenue, setTotalRevenue] = useState('');

  const queryClient = useQueryClient();

  useEffect(() => {
    if (report && visible) {
      setLines(
        report.lines.map((line: any) => ({
          lineId: line.line_id,
          itemId: line.item_id,
          itemName: line.item_name,
          start: line.start_stock.toString(),
          end: line.end_stock.toString(),
        }))
      );
      setNote(report.note || '');
      setTotalRevenue(report.total_revenue ? report.total_revenue.toString() : '');
    }
  }, [report, visible]);

  const handleSave = async () => {
    if (!lines.length) { 
      alert('Add at least one item'); 
      return; 
    }
    if (lines.some(l => !l.itemId)) { 
      alert('Each line needs an item'); 
      return; 
    }

    try {
      const payload = lines.map(l => ({
        item_id: l.itemId,
        start_stock: parseInt(l.start || '0', 10),
        end_stock: parseInt(l.end || '0', 10),
      }));

      const { error } = await supabase.rpc('update_stock_report_batch', {
        p_report_id: report.id,
        p_note: note || null,
        p_total_revenue: totalRevenue ? parseFloat(totalRevenue) : null,
        p_lines: payload,
      } as any);

      if (error) { 
        alert(error.message); 
        return; 
      }

      alert('Report updated successfully');
      
      queryClient.invalidateQueries({ queryKey: ['reports-multi'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['items-basic'] });
      
      onDismiss();
    } catch (err: any) {
      alert('Error updating report: ' + err.message);
    }
  };

  if (!visible) {return null;}

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={{ maxHeight: '90%' }}>
        <Dialog.Title>Edit Report</Dialog.Title>
        <Dialog.ScrollArea>
          <ScrollView>
            <ReportForm
              lines={lines}
              setLines={setLines}
              note={note}
              setNote={setNote}
              totalRevenue={totalRevenue}
              setTotalRevenue={setTotalRevenue}
              onSave={handleSave}
              saveButtonText="Save Changes"
              showAddFirstItem={false}
            />
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};