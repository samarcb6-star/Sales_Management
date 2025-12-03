import React, { useState, useEffect } from 'react';
import { User, UserStatus, Inquiry, Conveyance, AppSettings } from '../types';
import { getUsers, updateUserStatus, getInquiries, getConveyances, approveConveyance, getSettings, saveSettings, syncToGoogleSheets } from '../services/storage';
import { Button } from './Button';
import { Input } from './Input';
import { generateSalesInsight } from '../services/geminiService';
import { Users, FileText, CheckCircle, Settings, BrainCircuit, RefreshCw, CloudLightning } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [tab, setTab] = useState<'users' | 'reports' | 'approvals' | 'settings'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [conveyances, setConveyances] = useState<Conveyance[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>(getSettings());
  
  // Filters
  const [filterUser, setFilterUser] = useState<string>('');
  const [filterDateStart, setFilterDateStart] = useState<string>('');
  const [filterDateEnd, setFilterDateEnd] = useState<string>('');

  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setUsers(getUsers());
    setInquiries(getInquiries());
    setConveyances(getConveyances());
    setAppSettings(getSettings());
  };

  const handleUserAction = (userId: string, status: UserStatus) => {
    updateUserStatus(userId, status);
    refreshData();
  };

  const handleApproveConveyance = (id: string) => {
    approveConveyance(id);
    refreshData();
  };

  const handleUpdateSettings = () => {
    saveSettings(appSettings);
    alert("Settings updated");
  };

  const handleGenerateAIInsight = async () => {
    setAiInsight("Thinking...");
    const insight = await generateSalesInsight(inquiries);
    setAiInsight(insight);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncToGoogleSheets();
      alert("Manual Sync Completed!");
    } catch (e) {
      alert("Sync failed. Check console for details.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Filter Logic
  const filteredInquiries = inquiries.filter(i => {
    const matchUser = filterUser ? i.userId === filterUser : true;
    const matchStart = filterDateStart ? i.date >= filterDateStart : true;
    const matchEnd = filterDateEnd ? i.date <= filterDateEnd : true;
    return matchUser && matchStart && matchEnd;
  });

  const filteredConveyances = conveyances.filter(c => {
    const matchUser = filterUser ? c.userId === filterUser : true;
    const matchStart = filterDateStart ? c.date >= filterDateStart : true;
    const matchEnd = filterDateEnd ? c.date <= filterDateEnd : true;
    return matchUser && matchStart && matchEnd;
  });

  const totalExpense = filteredConveyances.reduce((acc, curr) => acc + curr.subTotal, 0);

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-slate-200 pb-2 no-print overflow-x-auto">
        <button onClick={() => setTab('users')} className={`px-4 py-2 flex items-center gap-2 ${tab === 'users' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>
          <Users size={18}/> Users
        </button>
        <button onClick={() => setTab('reports')} className={`px-4 py-2 flex items-center gap-2 ${tab === 'reports' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>
          <FileText size={18}/> Reports
        </button>
        <button onClick={() => setTab('approvals')} className={`px-4 py-2 flex items-center gap-2 ${tab === 'approvals' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>
          <CheckCircle size={18}/> Approvals
        </button>
        <button onClick={() => setTab('settings')} className={`px-4 py-2 flex items-center gap-2 ${tab === 'settings' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>
          <Settings size={18}/> Settings
        </button>
      </div>

      {tab === 'users' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-700 uppercase">
              <tr>
                <th className="px-6 py-3">Username</th>
                <th className="px-6 py-3">Full Name</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t hover:bg-slate-50">
                  <td className="px-6 py-4">{u.username}</td>
                  <td className="px-6 py-4">{u.fullName}</td>
                  <td className="px-6 py-4">{u.role}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${u.status === UserStatus.APPROVED ? 'bg-green-100 text-green-800' : u.status === UserStatus.PENDING ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex gap-2">
                    {u.status === UserStatus.PENDING && (
                      <>
                        <Button size="sm" variant="primary" onClick={() => handleUserAction(u.id, UserStatus.APPROVED)}>Approve</Button>
                        <Button size="sm" variant="danger" onClick={() => handleUserAction(u.id, UserStatus.REJECTED)}>Reject</Button>
                      </>
                    )}
                    {u.status === UserStatus.APPROVED && u.role !== 'OWNER' && (
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleUserAction(u.id, UserStatus.REJECTED)}>Revoke</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'reports' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-slate-50 p-4 rounded-lg flex flex-wrap gap-4 items-end no-print">
            <div className="w-48">
              <label className="block text-xs font-medium text-slate-500 mb-1">Filter User</label>
              <select className="w-full border rounded p-2" value={filterUser} onChange={e => setFilterUser(e.target.value)}>
                <option value="">All Users</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </select>
            </div>
            <div className="w-40">
               <label className="block text-xs font-medium text-slate-500 mb-1">Start Date</label>
               <input type="date" className="w-full border rounded p-2" value={filterDateStart} onChange={e => setFilterDateStart(e.target.value)} />
            </div>
            <div className="w-40">
               <label className="block text-xs font-medium text-slate-500 mb-1">End Date</label>
               <input type="date" className="w-full border rounded p-2" value={filterDateEnd} onChange={e => setFilterDateEnd(e.target.value)} />
            </div>
            <Button onClick={() => window.print()}>Print / Save PDF</Button>
            <Button variant="secondary" onClick={handleGenerateAIInsight}>
                <BrainCircuit className="w-4 h-4 mr-2"/> AI Analysis
            </Button>
          </div>

          {aiInsight && (
            <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg text-indigo-900">
                <h4 className="font-bold flex items-center gap-2"><BrainCircuit className="w-4 h-4"/> AI Sales Insight</h4>
                <p className="mt-2 text-sm">{aiInsight}</p>
            </div>
          )}

          {/* Inquiries Report */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
             <div className="p-4 border-b bg-slate-100 font-bold flex justify-between">
                 <span>Inquiries Report</span>
                 <span className="text-sm font-normal text-slate-500">{filteredInquiries.length} records</span>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-2">Date</th>
                            <th className="px-4 py-2">Sales Person</th>
                            <th className="px-4 py-2">Client</th>
                            <th className="px-4 py-2">Type</th>
                            <th className="px-4 py-2">Feedback</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredInquiries.map(i => {
                            const user = users.find(u => u.id === i.userId);
                            return (
                                <tr key={i.id} className="border-t">
                                    <td className="px-4 py-2">{i.date}</td>
                                    <td className="px-4 py-2 font-medium">{user?.fullName || 'Unknown'}</td>
                                    <td className="px-4 py-2">{i.customerName}</td>
                                    <td className="px-4 py-2">{i.customerType}</td>
                                    <td className="px-4 py-2 text-slate-600 truncate max-w-xs">{i.feedback}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
             </div>
          </div>

          {/* Conveyance Report */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
             <div className="p-4 border-b bg-slate-100 font-bold flex justify-between">
                 <span>Conveyance Report</span>
                 <span className="text-sm font-normal text-slate-500">Total Expense: ₹ {totalExpense.toFixed(2)}</span>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-2">Date</th>
                            <th className="px-4 py-2">User</th>
                            <th className="px-4 py-2">Desc</th>
                            <th className="px-4 py-2">Total KM</th>
                            <th className="px-4 py-2">Amount (₹)</th>
                            <th className="px-4 py-2">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredConveyances.map(c => {
                             const user = users.find(u => u.id === c.userId);
                             return (
                                <tr key={c.id} className="border-t">
                                    <td className="px-4 py-2">{c.date}</td>
                                    <td className="px-4 py-2 font-medium">{user?.fullName}</td>
                                    <td className="px-4 py-2">{c.description}</td>
                                    <td className="px-4 py-2">{c.totalKm}</td>
                                    <td className="px-4 py-2 font-bold">₹ {c.subTotal.toFixed(2)}</td>
                                    <td className="px-4 py-2 text-xs">{c.approved ? 'Approved' : 'Pending'}</td>
                                </tr>
                             );
                        })}
                    </tbody>
                </table>
             </div>
          </div>
        </div>
      )}

      {tab === 'approvals' && (
        <div className="bg-white shadow rounded-lg p-6">
            <h3 className="font-bold text-lg mb-4">Pending Conveyance Approvals</h3>
            {conveyances.filter(c => !c.approved).length === 0 ? (
                <p className="text-slate-500">No pending approvals.</p>
            ) : (
                <div className="space-y-4">
                    {conveyances.filter(c => !c.approved).map(c => {
                        const user = users.find(u => u.id === c.userId);
                        return (
                            <div key={c.id} className="border p-4 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="font-bold">{user?.fullName} <span className="text-slate-400 font-normal text-sm">| {c.date}</span></p>
                                    <p className="text-sm">{c.description} ({c.travelType})</p>
                                    <p className="text-sm font-medium mt-1">Total: ₹ {c.subTotal.toFixed(2)} ({c.totalKm} KM)</p>
                                </div>
                                <Button size="sm" onClick={() => handleApproveConveyance(c.id)}>Approve</Button>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
      )}

      {tab === 'settings' && (
        <div className="space-y-6">
            <div className="max-w-xl bg-white shadow rounded-lg p-6">
                <h3 className="font-bold text-lg mb-4">Global Application Settings</h3>
                <Input 
                    label="Per Kilometer Rate (₹)" 
                    type="number"
                    value={appSettings.perKmRate}
                    onChange={e => setAppSettings({...appSettings, perKmRate: Number(e.target.value)})}
                />
                
                <div className="border-t pt-4 mt-4">
                     <h4 className="font-medium text-slate-700 mb-2">Google Sheets Integration</h4>
                    
                    <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded mb-4">
                        <CloudLightning size={16} />
                        <div>
                           <strong>Integrated.</strong> Data is syncing automatically to the linked Google Sheet.
                        </div>
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                        <Button onClick={handleUpdateSettings}>Save Settings</Button>
                        <Button variant="secondary" onClick={handleSync} isLoading={isSyncing}>
                            <RefreshCw className="w-4 h-4 mr-2"/> Force Manual Sync
                        </Button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};