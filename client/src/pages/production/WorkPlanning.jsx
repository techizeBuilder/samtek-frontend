import React, { useState } from 'react';
import { useProduction } from '@/contexts/ProductionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, AlertTriangle, Clock, CheckCircle, ChevronRight, BarChart3, TrendingUp } from 'lucide-react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const statusColor = {
  'Pending': 'bg-slate-100 text-slate-600',
  'BOM Pending': 'bg-amber-100 text-amber-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  'Completed': 'bg-emerald-100 text-emerald-700',
  'On Hold': 'bg-red-100 text-red-600',
};

const priorityDot = {
  'Urgent': 'bg-red-500',
  'Normal': 'bg-slate-400',
};

function ProgressBar({ value, color = 'bg-blue-500' }) {
  return (
    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}

export default function WorkPlanning() {
  const { orders, getOrderProgress } = useProduction();
  const [view, setView] = useState('weekly'); // 'weekly' | 'daily'
  const [selectedDay, setSelectedDay] = useState('Mon');

  // For Gantt / weekly view: order deadlines relative to current week
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday

  const getWeekDates = () => {
    return DAYS.map((d, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      return { day: d, date: date.toISOString().split('T')[0], display: `${date.getDate()}/${date.getMonth() + 1}` };
    });
  };

  const weekDates = getWeekDates();

  const urgent = orders.filter(o => o.priority === 'Urgent' && o.status !== 'Completed');
  const normal = orders.filter(o => o.priority === 'Normal' && o.status !== 'Completed');
  const completed = orders.filter(o => o.status === 'Completed');

  // Orders for daily view: any order whose active process could be worked on today
  const ordersForDay = orders.filter(o => {
    if (o.status === 'Completed') return false;
    const activeProc = o.processes.find(p => p.status === 'In Progress' || p.status === 'Pending' || p.status === 'QC Pending');
    return !!activeProc;
  });

  const isOverdue = (order) => order.deliveryDate && order.status !== 'Completed' && new Date(order.deliveryDate) < today;
  const daysLeft = (order) => {
    const diff = new Date(order.deliveryDate) - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-600" /> Work Planning
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Daily & weekly production planning — prioritized by urgency and delivery date</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView('weekly')} className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${view === 'weekly' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}>
            Weekly View
          </button>
          <button onClick={() => setView('daily')} className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${view === 'daily' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}>
            Daily Plan
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-slate-800">{orders.filter(o => o.status !== 'Completed').length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Active Orders</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-red-50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-red-700">{urgent.length}</p>
            <p className="text-xs text-red-500 mt-0.5">Urgent Orders</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-amber-50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-amber-700">{orders.filter(o => isOverdue(o)).length}</p>
            <p className="text-xs text-amber-500 mt-0.5">Overdue Orders</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-emerald-50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-emerald-700">{completed.length}</p>
            <p className="text-xs text-emerald-500 mt-0.5">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly View */}
      {view === 'weekly' && (
        <>
          {/* Gantt-style Timeline */}
          <Card className="border-none shadow-sm">
            <CardHeader className="border-b border-slate-50 pb-3">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" /> Weekly Timeline
                <span className="text-xs font-normal text-slate-400 ml-2">
                  Week of {weekDates[0].display} – {weekDates[5].display}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase w-48">Order / Machine</th>
                      {weekDates.map(d => (
                        <th key={d.day} className={`text-center py-3 text-xs font-semibold text-slate-500 uppercase w-24 ${d.date === today.toISOString().split('T')[0] ? 'bg-blue-50 text-blue-600' : ''}`}>
                          {d.day}<br /><span className="font-normal normal-case text-slate-400">{d.display}</span>
                        </th>
                      ))}
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Delivery</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.filter(o => o.status !== 'Completed').map(order => {
                      const progress = getOrderProgress(order._id || order.id);
                      const activeProc = order.processes.find(p => p.status === 'In Progress');
                      const overdue = isOverdue(order);
                      const dl = daysLeft(order);
                      return (
                        <tr key={order._id || order.id} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDot[order.priority]}`} />
                              <div>
                                <div className="font-mono text-xs text-blue-700 font-bold">{order.orderId || order.id}</div>
                                <div className="text-xs font-medium text-slate-700">{order.machineName}</div>
                                <div className="mt-1"><ProgressBar value={progress} color={overdue ? 'bg-red-400' : 'bg-blue-500'} /></div>
                                <div className="text-xs text-slate-400 mt-0.5">{progress}% done{activeProc ? ` · ${activeProc.step}` : ''}</div>
                              </div>
                            </div>
                          </td>
                          {weekDates.map(d => {
                            const isToday = d.date === today.toISOString().split('T')[0];
                            const isActive = activeProc && order.status === 'In Progress';
                            const isDelivery = d.date === order.deliveryDate;
                            return (
                              <td key={d.day} className={`text-center py-3 px-1 ${isToday ? 'bg-blue-50/50' : ''}`}>
                                {isActive && !isDelivery && (
                                  <div className="mx-auto w-5 h-5 rounded bg-blue-500 flex items-center justify-center" title="Active">
                                    <span className="w-2 h-2 bg-white rounded-full" />
                                  </div>
                                )}
                                {isDelivery && (
                                  <div className={`mx-auto w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold ${overdue ? 'bg-red-500' : 'bg-amber-500'}`} title="Delivery">D</div>
                                )}
                              </td>
                            );
                          })}
                          <td className={`px-4 py-3 text-xs font-semibold ${overdue ? 'text-red-600' : dl <= 3 ? 'text-amber-600' : 'text-slate-600'}`}>
                            {order.deliveryDate}
                            {overdue ? <span className="block text-red-500">Overdue</span> : <span className="block text-slate-400">{dl}d left</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Priority Sections */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Urgent */}
            <Card className="border-none shadow-sm border-l-4 border-l-red-400">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-red-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Urgent Orders ({urgent.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {urgent.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">No urgent orders</p>
                ) : urgent.map(order => {
                  const progress = getOrderProgress(order._id || order.id);
                  const activeProc = order.processes.find(p => p.status === 'In Progress' || p.status === 'QC Pending');
                  return (
                    <div key={order._id || order.id} className="bg-red-50 border border-red-100 rounded-xl p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-mono text-xs text-red-700 font-bold">{order.orderId || order.id}</p>
                          <p className="font-semibold text-slate-900 text-sm">{order.machineName}</p>
                          {activeProc && <p className="text-xs text-slate-500 mt-0.5">Current: {activeProc.step}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-red-600 font-semibold">{daysLeft(order)}d left</p>
                          <p className="text-xs text-slate-400">{order.deliveryDate}</p>
                        </div>
                      </div>
                      <div className="mt-2"><ProgressBar value={progress} color="bg-red-400" /></div>
                      <p className="text-xs text-red-600 mt-1 font-semibold">{progress}% complete</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Normal */}
            <Card className="border-none shadow-sm border-l-4 border-l-slate-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Normal Priority ({normal.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {normal.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">No normal priority orders</p>
                ) : normal.map(order => {
                  const progress = getOrderProgress(order._id || order.id);
                  const activeProc = order.processes.find(p => p.status === 'In Progress' || p.status === 'QC Pending');
                  const overdue = isOverdue(order);
                  return (
                    <div key={order._id || order.id} className={`border rounded-xl p-3 ${overdue ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-mono text-xs text-slate-600 font-bold">{order.orderId || order.id}</p>
                          <p className="font-semibold text-slate-900 text-sm">{order.machineName}</p>
                          {activeProc && <p className="text-xs text-slate-500 mt-0.5">Current: {activeProc.step}</p>}
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-semibold ${statusColor[order.status]}`}>{order.status}</span>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs font-semibold ${overdue ? 'text-red-600' : daysLeft(order) <= 5 ? 'text-amber-600' : 'text-slate-600'}`}>
                            {overdue ? 'Overdue' : `${daysLeft(order)}d left`}
                          </p>
                          <p className="text-xs text-slate-400">{order.deliveryDate}</p>
                        </div>
                      </div>
                      <div className="mt-2"><ProgressBar value={progress} /></div>
                      <p className="text-xs text-slate-500 mt-1">{progress}% complete</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Daily View */}
      {view === 'daily' && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {weekDates.map(d => (
              <button
                key={d.day}
                onClick={() => setSelectedDay(d.day)}
                className={`flex-shrink-0 px-5 py-3 rounded-xl text-sm font-semibold border transition-all ${selectedDay === d.day ? 'bg-blue-600 text-white border-blue-600 shadow' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
              >
                <div>{d.day}</div>
                <div className="text-xs font-normal mt-0.5 opacity-80">{d.display}</div>
              </button>
            ))}
          </div>

          <Card className="border-none shadow-sm">
            <CardHeader className="border-b border-slate-50 pb-3">
              <CardTitle className="text-base font-semibold text-slate-800">
                Daily Plan — {selectedDay} ({weekDates.find(d => d.day === selectedDay)?.display})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {ordersForDay.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No active work scheduled for today.</p>
              ) : ordersForDay.map((order, idx) => {
                const activeProc = order.processes.find(p => p.status === 'In Progress' || p.status === 'QC Pending');
                const nextProc = order.processes.find(p => p.status === 'Pending');
                const progress = getOrderProgress(order._id || order.id);
                const overdue = isOverdue(order);
                return (
                  <div key={order._id || order.id} className={`flex gap-4 items-start p-4 rounded-xl border ${order.priority === 'Urgent' ? 'border-red-200 bg-red-50' : 'border-slate-100 bg-white'}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${order.priority === 'Urgent' ? 'bg-red-500' : 'bg-blue-500'}`}>{idx + 1}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-blue-700 font-bold">{order.orderId || order.id}</span>
                        <span className="font-semibold text-slate-900 text-sm">{order.machineName}</span>
                        {order.priority === 'Urgent' && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                            <AlertTriangle className="h-3 w-3" /> Urgent
                          </span>
                        )}
                        {overdue && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">Overdue</span>}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-slate-400">Active Process</p>
                          <p className="font-semibold text-slate-800">{activeProc ? `${activeProc.step} (${activeProc.status})` : '—'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Next Process</p>
                          <p className="font-semibold text-slate-600">{nextProc ? nextProc.step : 'All done'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Delivery Date</p>
                          <p className={`font-semibold ${overdue ? 'text-red-600' : 'text-slate-800'}`}>{order.deliveryDate}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Progress</p>
                          <div className="flex items-center gap-1.5">
                            <ProgressBar value={progress} color={overdue ? 'bg-red-400' : 'bg-blue-500'} />
                            <span className="font-semibold text-slate-700">{progress}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
