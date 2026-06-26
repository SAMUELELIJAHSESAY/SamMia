import { useState } from 'react';
import { useCompanyAttendance } from '../../hooks/useAttendance';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../../components/ui/Table';
import { formatTime, formatDuration, getInitials } from '../../lib/utils';
import { Calendar, Search } from 'lucide-react';

export function AttendancePage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const { data: attendance, isLoading } = useCompanyAttendance(date);

  const filtered = attendance?.filter((record: any) => {
    const searchLower = search.toLowerCase();
    return (
      (record.employee?.full_name || '').toLowerCase().includes(searchLower) ||
      (record.employee?.job_title || '').toLowerCase().includes(searchLower)
    );
  }) || [];

  const getStatusBadge = (record: any) => {
    if (record.is_late) return <Badge variant="warning">Late</Badge>;
    if (record.is_early_departure) return <Badge variant="info">Early</Badge>;
    if (record.is_missing_clock_out) return <Badge variant="error">Missing Out</Badge>;
    if (record.clock_in_at && record.clock_out_at) return <Badge variant="success">Complete</Badge>;
    if (record.clock_in_at) return <Badge variant="success">Clocked In</Badge>;
    return <Badge variant="neutral">Absent</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800"
              />
            </div>
            <div className="flex-1 max-w-xs">
              <Input
                placeholder="Search employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Employee</TableHeaderCell>
                  <TableHeaderCell>Clock In</TableHeaderCell>
                  <TableHeaderCell>Clock Out</TableHeaderCell>
                  <TableHeaderCell>Duration</TableHeaderCell>
                  <TableHeaderCell>Break</TableHeaderCell>
                  <TableHeaderCell>Overtime</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((record: any) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-medium text-blue-700 dark:text-blue-300">
                          {getInitials(record.employee?.full_name || '')}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{record.employee?.full_name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{record.employee?.job_title || 'Staff'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {record.clock_in_at ? (
                        <div>
                          <span className="font-medium">{formatTime(record.clock_in_at)}</span>
                          {record.late_minutes > 0 && (
                            <p className="text-xs text-red-500">+{record.late_minutes}m late</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {record.clock_out_at ? (
                        <span className="font-medium">{formatTime(record.clock_out_at)}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {record.net_working_minutes > 0 ? formatDuration(record.net_working_minutes) : '-'}
                    </TableCell>
                    <TableCell>
                      {record.total_break_minutes > 0 ? formatDuration(record.total_break_minutes) : '-'}
                    </TableCell>
                    <TableCell>
                      {record.overtime_minutes > 0 ? (
                        <span className="text-orange-600 font-medium">{formatDuration(record.overtime_minutes)}</span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(record)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
