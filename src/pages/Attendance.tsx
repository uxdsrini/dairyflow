import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, XCircle, AlertCircle, Award, Sparkles, Filter, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Worker, Attendance } from '../types';
import { getWorkers } from '../services/workerService';
import { getAttendanceByDate, markAttendance } from '../services/attendanceService';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';

const AttendancePage: React.FC = () => {
  const { currentUser } = useAuth();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, [date]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [workersData, attendanceData] = await Promise.all([
        getWorkers(currentUser?.uid),
        getAttendanceByDate(date, currentUser?.uid)
      ]);
      setWorkers(workersData.filter(w => w.status === 'active'));
      setAttendances(attendanceData);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async (worker: Worker, status: Attendance['status']) => {
    try {
      await markAttendance({
        workerId: worker.id,
        workerName: worker.name,
        date,
        status,
        createdBy: currentUser?.uid
      });
      toast.success(`Marked ${worker.name} as ${status}`);
      // Refresh local state without reloading full data
      setAttendances(prev => {
        const existing = prev.find(a => a.workerId === worker.id);
        if (existing) {
          return prev.map(a => a.workerId === worker.id ? { ...a, status } : a);
        } else {
          return [...prev, { id: 'temp', workerId: worker.id, workerName: worker.name, date, status, createdBy: currentUser?.uid }];
        }
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to record attendance');
    }
  };

  const getAttendanceStatus = (workerId: string): Attendance['status'] | 'not_marked' => {
    const match = attendances.find(a => a.workerId === workerId);
    return match ? match.status : 'not_marked';
  };

  const totalWorkers = workers.length;
  const presentCount = attendances.filter(a => a.status === 'present').length;
  const absentCount = attendances.filter(a => a.status === 'absent').length;
  const halfDayCount = attendances.filter(a => a.status === 'half_day').length;
  const leaveCount = attendances.filter(a => a.status === 'leave').length;

  const handleExportExcel = () => {
    if (workers.length === 0) {
      toast.error('No attendance data to export');
      return;
    }

    const rows = workers.map((worker, index) => {
      const attendance = attendances.find((item) => item.workerId === worker.id);
      return {
        'S.No': index + 1,
        'Date': date,
        'Worker Name': worker.name,
        'Role': worker.role.replace('_', ' '),
        'Status': attendance ? attendance.status.replace('_', ' ') : 'not marked',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 8 }, { wch: 14 }, { wch: 24 }, { wch: 20 }, { wch: 16 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
    const fileName = `DairyFlow_Attendance_${date}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success(`Downloaded ${fileName}`);
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff Attendance</h1>
          <p className="text-sm text-gray-500 mt-1">Mark daily attendance and track monthly worker reports.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <input
            type="date"
            className="input-field w-full sm:w-[160px] py-2 px-3"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button
            onClick={handleExportExcel}
            disabled={workers.length === 0}
            className="btn-secondary flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Export Excel
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{totalWorkers}</div>
          <div className="text-xs text-gray-500 mt-0.5">Active Staff</div>
        </div>
        <div className="card p-4 text-center border-l-4 border-l-emerald-500">
          <div className="text-2xl font-bold text-emerald-600">{presentCount}</div>
          <div className="text-xs text-gray-500 mt-0.5">Present</div>
        </div>
        <div className="card p-4 text-center border-l-4 border-l-amber-500">
          <div className="text-2xl font-bold text-amber-600">{halfDayCount}</div>
          <div className="text-xs text-gray-500 mt-0.5">Half Day</div>
        </div>
        <div className="card p-4 text-center border-l-4 border-l-red-500">
          <div className="text-2xl font-bold text-red-600">{absentCount}</div>
          <div className="text-xs text-gray-500 mt-0.5">Absent</div>
        </div>
        <div className="card p-4 text-center border-l-4 border-l-blue-500">
          <div className="text-2xl font-bold text-blue-600">{leaveCount}</div>
          <div className="text-xs text-gray-500 mt-0.5">Leave</div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-dairy-600 border-t-transparent rounded-full animate-spin"></div></div>
      ) : workers.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">No active workers found. Create workers on Workers page first.</div>
      ) : (
        <div className="card-flat overflow-hidden">
          <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Attendance Sheet</h3>
            <span className="text-xs text-gray-500">Showing {workers.length} workers</span>
          </div>

          <div className="divide-y divide-gray-100">
            {workers.map((w) => {
              const currentStatus = getAttendanceStatus(w.id);
              return (
                <div key={w.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/30 transition-colors">
                  <div>
                    <h4 className="font-bold text-gray-900">{w.name}</h4>
                    <p className="text-xs text-gray-500 capitalize">{w.role.replace('_', ' ')}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleMarkAttendance(w, 'present')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        currentStatus === 'present'
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/20'
                          : 'bg-white text-emerald-600 border-emerald-100 hover:bg-emerald-50'
                      }`}
                    >
                      Present
                    </button>
                    <button
                      onClick={() => handleMarkAttendance(w, 'half_day')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        currentStatus === 'half_day'
                          ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/20'
                          : 'bg-white text-amber-600 border-amber-100 hover:bg-amber-50'
                      }`}
                    >
                      Half Day
                    </button>
                    <button
                      onClick={() => handleMarkAttendance(w, 'absent')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        currentStatus === 'absent'
                          ? 'bg-red-500 text-white border-red-500 shadow-sm shadow-red-500/20'
                          : 'bg-white text-red-600 border-red-100 hover:bg-red-50'
                      }`}
                    >
                      Absent
                    </button>
                    <button
                      onClick={() => handleMarkAttendance(w, 'leave')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        currentStatus === 'leave'
                          ? 'bg-blue-500 text-white border-blue-500 shadow-sm shadow-blue-500/20'
                          : 'bg-white text-blue-600 border-blue-100 hover:bg-blue-50'
                      }`}
                    >
                      Leave
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendancePage;
