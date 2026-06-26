import { useState } from 'react';
import { useAttendanceHistory } from '../../hooks/useAttendance';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../ui/Table';
import { formatDate, formatTime, formatDuration } from '../../lib/utils';
import { Calendar, Clock } from 'lucide-react';

export function AttendanceHistory() {
  const [days, setDays] = useState(30);
  const { data: history, isLoading } = useAttendanceHistory(days);

  const getStatusBadge = (record: any) => {
    if (record.is_late) return <Badge variant="warning">Late</Badge>;
    if (record.is_early_departure) return <Badge variant="info">Early</Badge>;
    if (record.is_missing_clock_out) return <Badge variant="error">Missing Out</Badge>;
    if (record.attendance_status === 'present') return <Badge variant="success">Present</Badge>;
    return <Badge variant="neutral">{record.attendance_status}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Attendance History</CardTitle>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-800"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !history || history.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No attendance records found</p>
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Clock In</TableHeaderCell>
                <TableHeaderCell>Clock Out</TableHeaderCell>
                <TableHeaderCell>Duration</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {formatDate(record.date)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {record.clock_in_at ? (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {formatTime(record.clock_in_at)}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {record.clock_out_at ? (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {formatTime(record.clock_out_at)}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {record.net_working_minutes > 0
                      ? formatDuration(record.net_working_minutes)
                      : '-'}
                  </TableCell>
                  <TableCell>{getStatusBadge(record)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
