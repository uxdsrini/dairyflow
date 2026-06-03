import React, { useState, useEffect } from 'react';
import { DollarSign, Award, Calendar, Check, AlertCircle, RefreshCw, Download } from 'lucide-react';
import { Worker, Salary, Attendance } from '../types';
import { getWorkers } from '../services/workerService';
import { getSalariesByMonth, addSalary, markSalaryPaid } from '../services/salaryService';
import { getAllAttendance } from '../services/attendanceService';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';

const Salaries: React.FC = () => {
  const { currentUser } = useAuth();
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  // Month & Year Filter
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  // Edit fields State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [advance, setAdvance] = useState(0);
  const [deduction, setDeduction] = useState(0);
  const [overtime, setOvertime] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [month, year]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [workersData, salariesData, attendanceData] = await Promise.all([
        getWorkers(currentUser?.uid),
        getSalariesByMonth(month, year, currentUser?.uid),
        getAllAttendance(currentUser?.uid)
      ]);
      setWorkers(workersData.filter(w => w.status === 'active'));
      setSalaries(salariesData);
      setAttendances(attendanceData);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load salaries');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateSalaries = async () => {
    setLoading(true);
    try {
      let count = 0;
      for (const w of workers) {
        // Filter attendance for this worker & selected month/year
        const workerAtts = attendances.filter(a => {
          if (a.workerId !== w.id) return false;
          const [aYear, aMonth] = a.date.split('-');
          return Number(aYear) === year && Number(aMonth) === month;
        });

        const presentDays = workerAtts.filter(a => a.status === 'present').length;
        const halfDays = workerAtts.filter(a => a.status === 'half_day').length;
        const absentDays = workerAtts.filter(a => a.status === 'absent').length;

        // Simple calculation: baseSalary * (presentDays + 0.5 * halfDays) / 30
        const totalEffectiveDays = presentDays + (0.5 * halfDays);
        const dailyRate = w.monthlySalary / 30;
        const calculatedBase = Math.round(dailyRate * totalEffectiveDays);

        // Find existing salary record if any
        const existing = salaries.find(s => s.workerId === w.id);
        const payload: Omit<Salary, 'id' | 'createdAt'> = {
          workerId: w.id,
          workerName: w.name,
          month,
          year,
          baseSalary: calculatedBase,
          daysPresent: presentDays,
          daysAbsent: absentDays,
          halfDays: halfDays,
          advance: existing ? existing.advance : 0,
          deduction: existing ? existing.deduction : 0,
          overtime: existing ? existing.overtime : 0,
          netSalary: calculatedBase + (existing ? existing.overtime : 0) - (existing ? (existing.advance + existing.deduction) : 0),
          status: existing ? existing.status : 'unpaid',
          createdBy: existing?.createdBy || currentUser?.uid
        };

        await addSalary(payload);
        count++;
      }

      toast.success(`Calculated monthly salary for ${count} workers!`);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Error generating salaries');
      setLoading(false);
    }
  };

  const handleEditSalary = (s: Salary) => {
    setEditingId(s.id);
    setAdvance(s.advance);
    setDeduction(s.deduction);
    setOvertime(s.overtime);
  };

  const handleSaveSalaryChanges = async (s: Salary) => {
    setSaving(true);
    try {
      const netSalary = s.baseSalary + Number(overtime) - (Number(advance) + Number(deduction));
      await addSalary({
        ...s,
        advance: Number(advance),
        deduction: Number(deduction),
        overtime: Number(overtime),
        netSalary,
      });
      toast.success('Salary updated successfully');
      setEditingId(null);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update salary details');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    if (!window.confirm('Are you sure you want to mark this salary as paid?')) return;
    try {
      await markSalaryPaid(id);
      toast.success('Salary status updated to Paid');
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to mark paid');
    }
  };

  const totalExpense = salaries.reduce((acc, s) => acc + s.netSalary, 0);

  const handleExportExcel = () => {
    if (salaries.length === 0) {
      toast.error('No salaries to export');
      return;
    }

    const rows: any[] = salaries.map((salary, index) => ({
      'S.No': index + 1,
      'Worker Name': salary.workerName,
      'Month': month,
      'Year': year,
      'Days Present': salary.daysPresent,
      'Half Days': salary.halfDays,
      'Days Absent': salary.daysAbsent,
      'Base Salary': salary.baseSalary,
      'Advance': salary.advance,
      'Deduction': salary.deduction,
      'Overtime': salary.overtime,
      'Net Salary': salary.netSalary,
      'Status': salary.status,
    }));

    rows.push({
      'S.No': '' as any,
      'Worker Name': 'TOTAL',
      'Month': month,
      'Year': year,
      'Days Present': '' as any,
      'Half Days': '' as any,
      'Days Absent': '' as any,
      'Base Salary': '' as any,
      'Advance': '' as any,
      'Deduction': '' as any,
      'Overtime': '' as any,
      'Net Salary': totalExpense,
      'Status': '',
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 8 }, { wch: 24 }, { wch: 10 }, { wch: 10 }, { wch: 14 },
      { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 14 }, { wch: 12 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Salaries');
    const fileName = `DairyFlow_Salaries_${year}_${String(month).padStart(2, '0')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success(`Downloaded ${fileName}`);
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Salaries Management</h1>
          <p className="text-sm text-gray-500 mt-1">Compute monthly staff salaries based on attendance, overtime, and advances.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="select-field py-2 px-3 text-sm max-w-[100px]"
          >
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
              <option key={m} value={m}>{new Date(2026, m-1, 1).toLocaleString('default', { month: 'short' })}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="select-field py-2 px-3 text-sm max-w-[100px]"
          >
            {[2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={handleCalculateSalaries}
            className="btn-primary flex items-center gap-1.5 text-sm py-2 px-3"
          >
            <RefreshCw className="w-4 h-4" /> Calculate Salaries
          </button>
          <button
            onClick={handleExportExcel}
            disabled={salaries.length === 0}
            className="btn-secondary flex items-center gap-1.5 text-sm py-2 px-3"
          >
            <Download className="w-4 h-4" /> Export Excel
          </button>
        </div>
      </div>

      <div className="card p-4 flex justify-between items-center bg-dairy-50 border border-dairy-200">
        <div>
          <span className="text-xs font-semibold text-dairy-800 uppercase tracking-wider">Total Monthly Salary Expense</span>
          <h2 className="text-2xl font-black text-dairy-950">₹{totalExpense.toLocaleString()}</h2>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-dairy-600 border-t-transparent rounded-full animate-spin"></div></div>
      ) : salaries.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">No salary calculations found for this month. Click "Calculate Salaries" to calculate.</div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block table-container">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="p-4">Worker</th>
                  <th className="p-4">Attendance Stats</th>
                  <th className="p-4">Base Salary</th>
                  <th className="p-4">Deductions / Advance</th>
                  <th className="p-4">Overtime</th>
                  <th className="p-4">Net Salary</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {salaries.map((s) => {
                  const isEditing = editingId === s.id;
                  return (
                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-semibold text-gray-900">{s.workerName}</td>
                      <td className="p-4 text-xs text-gray-600">
                        <div>Pres: <strong>{s.daysPresent}</strong></div>
                        <div>Half: <strong>{s.halfDays}</strong></div>
                        <div>Abs: <strong>{s.daysAbsent}</strong></div>
                      </td>
                      <td className="p-4 font-medium">₹{s.baseSalary}</td>
                      <td className="p-4">
                        {isEditing ? (
                          <div className="space-y-1">
                            <input
                              type="number"
                              placeholder="Adv"
                              value={advance}
                              onChange={(e) => setAdvance(Number(e.target.value))}
                              className="input-field py-1 text-xs max-w-[80px]"
                            />
                            <input
                              type="number"
                              placeholder="Ded"
                              value={deduction}
                              onChange={(e) => setDeduction(Number(e.target.value))}
                              className="input-field py-1 text-xs max-w-[80px]"
                            />
                          </div>
                        ) : (
                          <div>
                            <div>Adv: ₹{s.advance}</div>
                            <div>Ded: ₹{s.deduction}</div>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        {isEditing ? (
                          <input
                            type="number"
                            value={overtime}
                            onChange={(e) => setOvertime(Number(e.target.value))}
                            className="input-field py-1 text-xs max-w-[80px]"
                          />
                        ) : (
                          <span>₹{s.overtime}</span>
                        )}
                      </td>
                      <td className="p-4 font-bold text-gray-900">₹{s.netSalary}</td>
                      <td className="p-4">
                        <span className={s.status === 'paid' ? 'badge-green' : 'badge-red'}>
                          {s.status}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        {isEditing ? (
                          <button
                            onClick={() => handleSaveSalaryChanges(s)}
                            disabled={saving}
                            className="btn-primary text-xs py-1.5 px-3"
                          >
                            Save
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEditSalary(s)}
                              className="btn-secondary text-xs py-1.5 px-3"
                            >
                              Edit
                            </button>
                            {s.status === 'unpaid' && (
                              <button
                                onClick={() => handleMarkPaid(s.id)}
                                className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-xs py-1.5 px-3 flex-inline items-center gap-1 border-none"
                              >
                                <Check className="w-3.5 h-3.5 inline" /> Mark Paid
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {salaries.map((s) => {
              const isEditing = editingId === s.id;
              return (
                <div key={s.id} className="card p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-gray-900">{s.workerName}</h4>
                      <p className="text-xs text-gray-500">Net Salary: <strong className="text-gray-900 text-sm">₹{s.netSalary}</strong></p>
                    </div>
                    <span className={s.status === 'paid' ? 'badge-green' : 'badge-red'}>
                      {s.status}
                    </span>
                  </div>

                  <div className="text-xs text-gray-600 space-y-1 bg-gray-50 p-2.5 rounded-xl">
                    <div className="flex justify-between">
                      <span>Att: Present({s.daysPresent}) Half({s.halfDays}) Absent({s.daysAbsent})</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Base: ₹{s.baseSalary}</span>
                    </div>
                    {isEditing ? (
                      <div className="grid grid-cols-3 gap-2 pt-2">
                        <div>
                          <label className="text-[10px] text-gray-400 block">Advance</label>
                          <input
                            type="number"
                            value={advance}
                            onChange={(e) => setAdvance(Number(e.target.value))}
                            className="input-field py-1 px-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 block">Deduction</label>
                          <input
                            type="number"
                            value={deduction}
                            onChange={(e) => setDeduction(Number(e.target.value))}
                            className="input-field py-1 px-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 block">Overtime</label>
                          <input
                            type="number"
                            value={overtime}
                            onChange={(e) => setOvertime(Number(e.target.value))}
                            className="input-field py-1 px-2 text-xs"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between text-gray-400">
                        <span>Adv: ₹{s.advance} | Ded: ₹{s.deduction} | OT: ₹{s.overtime}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                    {isEditing ? (
                      <button
                        onClick={() => handleSaveSalaryChanges(s)}
                        disabled={saving}
                        className="btn-primary py-1.5 px-3 text-xs"
                      >
                        Save
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEditSalary(s)}
                          className="btn-secondary py-1.5 px-3 text-xs"
                        >
                          Edit
                        </button>
                        {s.status === 'unpaid' && (
                          <button
                            onClick={() => handleMarkPaid(s.id)}
                            className="btn-primary bg-emerald-600 hover:bg-emerald-700 py-1.5 px-3 text-xs border-none"
                          >
                            Mark Paid
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default Salaries;
