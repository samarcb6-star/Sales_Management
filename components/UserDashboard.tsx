import React, { useState, useEffect } from 'react';
import { User, Inquiry, Conveyance, CustomerType, TravelType, AppSettings } from '../types';
import { getInquiries, addInquiry, getConveyances, addConveyance, getSettings } from '../services/storage';
import { Input, Select } from './Input';
import { Button } from './Button';
import { PlusCircle, FileText, Truck, Download } from 'lucide-react';
import { analyzeSentiment } from '../services/geminiService';

interface Props {
  currentUser: User;
}

export const UserDashboard: React.FC<Props> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'inquiry' | 'conveyance' | 'reports'>('inquiry');
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [conveyances, setConveyances] = useState<Conveyance[]>([]);

  // Inquiry Form State
  const [inqForm, setInqForm] = useState<Partial<Inquiry>>({
    date: new Date().toISOString().split('T')[0],
    customerType: CustomerType.HOT,
    customerName: '',
    contactPerson: '',
    mobile1: '',
    mobile2: '',
    feedback: ''
  });

  // Conveyance Form State
  const [convForm, setConvForm] = useState<Partial<Conveyance>>({
    date: new Date().toISOString().split('T')[0],
    description: '',
    travelType: TravelType.BIKE,
    fromKm: 0,
    toKm: 0,
    foodingCost: 0,
    loadingCost: 0,
    otherCost: 0
  });

  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    refreshData();
  }, [currentUser]);

  const refreshData = () => {
    const allInq = getInquiries().filter(i => i.userId === currentUser.id);
    const allConv = getConveyances().filter(c => c.userId === currentUser.id);
    setInquiries(allInq);
    setConveyances(allConv);
    setSettings(getSettings());
  };

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inqForm.customerName || !inqForm.mobile1) return alert("Please fill required fields");

    setAiLoading(true);
    let sentiment = "N/A";
    if (inqForm.feedback) {
      sentiment = await analyzeSentiment(inqForm.feedback);
    }
    setAiLoading(false);

    const newInq: Inquiry = {
      id: crypto.randomUUID(),
      userId: currentUser.id,
      date: inqForm.date!,
      customerType: inqForm.customerType!,
      customerName: inqForm.customerName!,
      contactPerson: inqForm.contactPerson!,
      mobile1: inqForm.mobile1!,
      mobile2: inqForm.mobile2,
      feedback: inqForm.feedback!,
      aiSentiment: sentiment
    };

    addInquiry(newInq);
    refreshData();
    alert("Inquiry Added!");
    setInqForm({ ...inqForm, customerName: '', contactPerson: '', mobile1: '', mobile2: '', feedback: '' });
  };

  const handleConveyanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalKm = (convForm.toKm || 0) - (convForm.fromKm || 0);
    if (totalKm < 0) return alert("To KM must be greater than From KM");

    const rate = settings.perKmRate;
    const subTotal = (totalKm * rate) + (convForm.foodingCost || 0) + (convForm.loadingCost || 0) + (convForm.otherCost || 0);

    const newConv: Conveyance = {
      id: crypto.randomUUID(),
      userId: currentUser.id,
      date: convForm.date!,
      description: convForm.description!,
      travelType: convForm.travelType!,
      fromKm: convForm.fromKm || 0,
      toKm: convForm.toKm || 0,
      totalKm,
      ratePerKm: rate,
      foodingCost: convForm.foodingCost || 0,
      loadingCost: convForm.loadingCost || 0,
      otherCost: convForm.otherCost || 0,
      subTotal,
      approved: false
    };

    addConveyance(newConv);
    refreshData();
    alert("Conveyance Added!");
    setConvForm({ ...convForm, description: '', fromKm: convForm.toKm, toKm: 0, foodingCost: 0, loadingCost: 0, otherCost: 0 });
  };

  const downloadCSV = () => {
    const headers = ["Date", "Type", "Name", "Mobile", "Feedback"];
    const rows = inquiries.map(i => [i.date, i.customerType, i.customerName, i.mobile1, i.feedback]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "my_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-slate-200 pb-2 no-print overflow-x-auto">
        <button onClick={() => setActiveTab('inquiry')} className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'inquiry' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>
          <PlusCircle className="inline w-4 h-4 mr-2"/> Add Inquiry
        </button>
        <button onClick={() => setActiveTab('conveyance')} className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'conveyance' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>
          <Truck className="inline w-4 h-4 mr-2"/> Add Conveyance
        </button>
        <button onClick={() => setActiveTab('reports')} className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'reports' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>
          <FileText className="inline w-4 h-4 mr-2"/> My Reports
        </button>
      </div>

      {activeTab === 'inquiry' && (
        <form onSubmit={handleInquirySubmit} className="max-w-2xl bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">New Inquiry</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Date" type="date" value={inqForm.date} onChange={e => setInqForm({...inqForm, date: e.target.value})} required />
            <Select 
              label="Customer Type" 
              options={Object.values(CustomerType).map(t => ({label: t, value: t}))}
              value={inqForm.customerType}
              onChange={e => setInqForm({...inqForm, customerType: e.target.value as CustomerType})}
            />
            <Input label="Customer/School Name" value={inqForm.customerName} onChange={e => setInqForm({...inqForm, customerName: e.target.value})} required />
            <Input label="Contact Person" value={inqForm.contactPerson} onChange={e => setInqForm({...inqForm, contactPerson: e.target.value})} />
            <Input label="Mobile 1" value={inqForm.mobile1} onChange={e => setInqForm({...inqForm, mobile1: e.target.value})} required />
            <Input label="Mobile 2" value={inqForm.mobile2} onChange={e => setInqForm({...inqForm, mobile2: e.target.value})} />
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Feedback</label>
              <textarea 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                rows={3}
                value={inqForm.feedback}
                onChange={e => setInqForm({...inqForm, feedback: e.target.value})}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button type="submit" isLoading={aiLoading}>Save Inquiry</Button>
          </div>
        </form>
      )}

      {activeTab === 'conveyance' && (
        <form onSubmit={handleConveyanceSubmit} className="max-w-2xl bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Local Conveyance</h2>
          <div className="bg-blue-50 p-4 rounded mb-4 text-sm text-blue-800">
            Current Rate: <strong>₹ {settings.perKmRate} per KM</strong>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Date" type="date" value={convForm.date} onChange={e => setConvForm({...convForm, date: e.target.value})} required />
            <Input label="Description" value={convForm.description} onChange={e => setConvForm({...convForm, description: e.target.value})} required />
            <Select 
              label="Travel Mode" 
              options={Object.values(TravelType).map(t => ({label: t, value: t}))}
              value={convForm.travelType}
              onChange={e => setConvForm({...convForm, travelType: e.target.value as TravelType})}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input label="From KM" type="number" value={convForm.fromKm} onChange={e => setConvForm({...convForm, fromKm: Number(e.target.value)})} required />
              <Input label="To KM" type="number" value={convForm.toKm} onChange={e => setConvForm({...convForm, toKm: Number(e.target.value)})} required />
            </div>
            <div className="md:col-span-2 text-right font-medium text-slate-600">
              Total Running: {Math.max(0, (convForm.toKm || 0) - (convForm.fromKm || 0))} KM
            </div>
            <Input label="Fooding (₹)" type="number" value={convForm.foodingCost} onChange={e => setConvForm({...convForm, foodingCost: Number(e.target.value)})} />
            <Input label="Loading (₹)" type="number" value={convForm.loadingCost} onChange={e => setConvForm({...convForm, loadingCost: Number(e.target.value)})} />
            <Input label="Other (₹)" type="number" value={convForm.otherCost} onChange={e => setConvForm({...convForm, otherCost: Number(e.target.value)})} />
          </div>
          <div className="mt-4 flex justify-end items-center gap-4">
             <div className="text-lg font-bold">
               Sub Total: ₹ {
                 ((Math.max(0, (convForm.toKm || 0) - (convForm.fromKm || 0)) * settings.perKmRate) + 
                 (convForm.foodingCost || 0) + 
                 (convForm.loadingCost || 0) + 
                 (convForm.otherCost || 0)).toFixed(2)
               }
             </div>
            <Button type="submit">Add Conveyance</Button>
          </div>
        </form>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-8">
           <div className="flex justify-between items-center no-print">
            <h2 className="text-xl font-bold">My Report</h2>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => window.print()}>Print / Save PDF</Button>
              <Button variant="secondary" onClick={downloadCSV}><Download className="w-4 h-4 mr-2"/> Export CSV</Button>
            </div>
           </div>

           <div className="bg-white rounded-lg shadow overflow-hidden">
             <h3 className="bg-slate-100 p-3 font-semibold border-b">Recent Inquiries</h3>
             <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Feedback</th>
                    <th className="px-4 py-3">AI Sentiment</th>
                  </tr>
                </thead>
                <tbody>
                  {inquiries.slice().reverse().map(i => (
                    <tr key={i.id} className="border-t hover:bg-slate-50">
                      <td className="px-4 py-2">{i.date}</td>
                      <td className="px-4 py-2">{i.customerName}</td>
                      <td className="px-4 py-2">{i.contactPerson} ({i.mobile1})</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${i.customerType === CustomerType.HOT ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-800'}`}>
                          {i.customerType}
                        </span>
                      </td>
                      <td className="px-4 py-2">{i.feedback}</td>
                      <td className="px-4 py-2 text-xs">{i.aiSentiment}</td>
                    </tr>
                  ))}
                  {inquiries.length === 0 && <tr><td colSpan={6} className="px-4 py-4 text-center text-slate-500">No records found</td></tr>}
                </tbody>
              </table>
             </div>
           </div>

           <div className="bg-white rounded-lg shadow overflow-hidden">
             <h3 className="bg-slate-100 p-3 font-semibold border-b">Conveyance History</h3>
             <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Desc</th>
                    <th className="px-4 py-3">Route (KM)</th>
                    <th className="px-4 py-3">Run</th>
                    <th className="px-4 py-3">Costs (₹)</th>
                    <th className="px-4 py-3">Total (₹)</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {conveyances.slice().reverse().map(c => (
                    <tr key={c.id} className="border-t hover:bg-slate-50">
                      <td className="px-4 py-2">{c.date}</td>
                      <td className="px-4 py-2">{c.description} <br/> <span className="text-xs text-slate-500">{c.travelType}</span></td>
                      <td className="px-4 py-2">{c.fromKm} - {c.toKm}</td>
                      <td className="px-4 py-2 font-medium">{c.totalKm} km</td>
                      <td className="px-4 py-2 text-xs text-slate-500">
                        F: {c.foodingCost} | L: {c.loadingCost} | O: {c.otherCost}
                      </td>
                      <td className="px-4 py-2 font-bold">₹ {c.subTotal.toFixed(2)}</td>
                      <td className="px-4 py-2">
                         {c.approved ? 
                           <span className="text-green-600 font-bold text-xs border border-green-200 bg-green-50 px-2 py-1 rounded">APPROVED</span> : 
                           <span className="text-amber-600 font-bold text-xs border border-amber-200 bg-amber-50 px-2 py-1 rounded">PENDING</span>
                         }
                      </td>
                    </tr>
                  ))}
                   {conveyances.length === 0 && <tr><td colSpan={7} className="px-4 py-4 text-center text-slate-500">No records found</td></tr>}
                </tbody>
              </table>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};