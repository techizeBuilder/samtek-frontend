import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useProduction, PROCESS_STEPS } from '@/contexts/ProductionContext';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Users, TrendingUp, Wrench, CheckCircle, Clock, Plus, Star, X } from 'lucide-react';

// Shared by the live "Active" board (over context's active-orders) and the
// on-demand "View Full History" query below (over a team's full history) —
// both just need to flatten (order × process) down to one team's assignments.
const assignmentsForTeam = (ordersArr, teamId) =>
  ordersArr.flatMap(o =>
    o.processes
      .filter(p => {
        const pid = p.assignedTeam?._id || p.assignedTeam;
        return pid && String(pid) === String(teamId);
      })
      .map(p => ({ orderId: o.orderId || o._id || o.id, machineName: o.machineName, priority: o.priority, ...p }))
  );

const emptyTeam = { name: '', supervisor: '', membersInput: '', skills: [], efficiency: '85' };

const efficiencyColor = (e) => {
  if (e >= 90) return 'text-emerald-600';
  if (e >= 80) return 'text-blue-600';
  return 'text-amber-600';
};

const efficiencyBg = (e) => {
  if (e >= 90) return 'bg-emerald-500';
  if (e >= 80) return 'bg-blue-500';
  return 'bg-amber-500';
};

const skillColor = {
  'Job Work': 'bg-purple-100 text-purple-700 border-purple-200',
  'Fabrication': 'bg-blue-100 text-blue-700 border-blue-200',
  'Assembly': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Painting': 'bg-pink-100 text-pink-700 border-pink-200',
  'Re-Assembly': 'bg-orange-100 text-orange-700 border-orange-200',
  'Final Testing': 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

export default function ManpowerTracking() {
  const { orders, teams, addTeam, getTeamById } = useProduction();
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [addTeamOpen, setAddTeamOpen] = useState(false);
  const [teamForm, setTeamForm] = useState(emptyTeam);

  const handleAddTeam = () => {
    if (!teamForm.name || !teamForm.supervisor) return;
    const members = teamForm.membersInput.split(',').map(m => m.trim()).filter(Boolean);
    addTeam({ ...teamForm, members });
    setTeamForm(emptyTeam);
    setAddTeamOpen(false);
  };

  const toggleSkill = (skill) => {
    setTeamForm(f => ({
      ...f,
      skills: f.skills.includes(skill) ? f.skills.filter(s => s !== skill) : [...f.skills, skill],
    }));
  };

  // Active assignments (In Progress / QC Pending) only ever occur on
  // non-Completed orders, so the context's active-orders feed is safe here —
  // this is the live "what's happening right now" board.
  const getActiveAssignments = (teamId) => {
    return assignmentsForTeam(orders, teamId).filter(a => a.status === 'In Progress' || a.status === 'QC Pending');
  };

  const totalTeamMembers = teams.reduce((s, t) => s + t.members.length, 0);
  const totalActiveAssignments = teams.reduce((s, t) => s + getActiveAssignments(t._id || t.id).length, 0);
  const avgEfficiency = Math.round(teams.reduce((s, t) => s + t.efficiency, 0) / (teams.length || 1));

  const selectedTeam = selectedTeamId ? teams.find(t => String(t._id || t.id) === selectedTeamId) : null;

  // On-demand — fetched only while the history modal is open, over this
  // team's full order history (not just the active window), so old
  // completed assignments still show up here.
  const { data: teamHistoryData, isLoading: teamHistoryLoading } = useQuery({
    queryKey: ['production-mfg-orders', 'team-history', selectedTeamId],
    queryFn: () => apiRequest('GET', `/api/production-mfg/teams/${selectedTeamId}/history`),
    enabled: !!selectedTeamId && viewDialogOpen,
  });
  const selectedTeamAssignments = selectedTeamId
    ? assignmentsForTeam(teamHistoryData?.data || [], selectedTeamId)
    : [];

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" /> Manpower Tracking
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Team performance, skill mapping, and process assignments</p>
        </div>
        <Button onClick={() => setAddTeamOpen(true)} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <Plus className="h-4 w-4 mr-1" /> Add Team
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-slate-800">{teams.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Production Teams</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-blue-50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-blue-700">{totalTeamMembers}</p>
            <p className="text-xs text-blue-500 mt-0.5">Total Manpower</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-amber-50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-amber-700">{totalActiveAssignments}</p>
            <p className="text-xs text-amber-500 mt-0.5">Active Assignments</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-emerald-50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-emerald-700">{avgEfficiency}%</p>
            <p className="text-xs text-emerald-500 mt-0.5">Avg Efficiency</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Cards */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {teams.map(team => {
          const tid = team._id || team.id;
          const active = getActiveAssignments(tid);
          // All-time counts from the backend (see getTeams) — independent of
          // the active-orders window, so these don't shrink to "recent only".
          const done = team.assignmentStats?.completed || 0;
          const total = team.assignmentStats?.total || 0;
          return (
            <Card key={tid} className="border-none shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                      {team.name.slice(-1)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{team.name}</h3>
                      <p className="text-xs text-slate-500">Supervisor: {team.supervisor}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-bold ${efficiencyColor(team.efficiency)}`}>{team.efficiency}%</p>
                    <p className="text-xs text-slate-400">Efficiency</p>
                  </div>
                </div>

                {/* Efficiency Bar */}
                <div className="mb-4">
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${efficiencyBg(team.efficiency)}`} style={{ width: `${team.efficiency}%` }} />
                  </div>
                </div>

                {/* Members */}
                <div className="mb-3">
                  <p className="text-xs text-slate-400 mb-1.5">Team Members ({team.members.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {team.members.map(m => (
                      <span key={m} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">{m}</span>
                    ))}
                  </div>
                </div>

                {/* Skills */}
                <div className="mb-4">
                  <p className="text-xs text-slate-400 mb-1.5">Process Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {team.skills.map(s => (
                      <span key={s} className={`px-2 py-0.5 rounded text-xs font-semibold border ${skillColor[s] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{s}</span>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center mb-4">
                  <div className="bg-blue-50 rounded-lg p-2">
                    <p className="text-lg font-bold text-blue-700">{active.length}</p>
                    <p className="text-xs text-blue-500">Active</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-2">
                    <p className="text-lg font-bold text-emerald-700">{done}</p>
                    <p className="text-xs text-emerald-500">Completed</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-lg font-bold text-slate-700">{total}</p>
                    <p className="text-xs text-slate-500">Total</p>
                  </div>
                </div>

                {/* Active Assignment Highlight */}
                {active.length > 0 && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-3">
                    <p className="text-xs font-bold text-blue-700 mb-1.5">Currently Active</p>
                    {active.map((a, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-800">{a.step}</span>
                        <span className="text-slate-500">{a.orderId}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${a.status === 'QC Pending' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{a.status}</span>
                      </div>
                    ))}
                  </div>
                )}

                <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => { setSelectedTeamId(String(team._id || team.id)); setViewDialogOpen(true); }}>
                  View Full History
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Skill Matrix */}
      <Card className="border-none shadow-sm">
        <CardHeader className="border-b border-slate-50 pb-3">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" /> Skill Matrix
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Team</th>
                  {PROCESS_STEPS.map(step => (
                    <th key={step} className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">{step}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teams.map(team => (
                  <tr key={team._id || team.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900">{team.name}</div>
                      <div className="text-xs text-slate-400">{team.supervisor}</div>
                    </td>
                    {PROCESS_STEPS.map(step => (
                      <td key={step} className="text-center px-3 py-3.5">
                        {team.skills.includes(step) ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500 mx-auto" />
                        ) : (
                          <span className="w-4 h-4 block mx-auto bg-slate-100 rounded-full" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Team Dialog */}
      <Dialog open={addTeamOpen} onOpenChange={setAddTeamOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-blue-600" /> Add New Team</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Team Name *</label>
                <Input placeholder="e.g. Team D" value={teamForm.name} onChange={e => setTeamForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Efficiency (%)</label>
                <Input type="number" min="0" max="100" placeholder="85" value={teamForm.efficiency} onChange={e => setTeamForm(f => ({ ...f, efficiency: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Supervisor Name *</label>
              <Input placeholder="e.g. Ravi Kumar" value={teamForm.supervisor} onChange={e => setTeamForm(f => ({ ...f, supervisor: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Members <span className="font-normal text-slate-400">(comma separated)</span></label>
              <Input placeholder="e.g. Raju, Arjun, Naveen" value={teamForm.membersInput} onChange={e => setTeamForm(f => ({ ...f, membersInput: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-2 block">Process Skills <span className="font-normal text-slate-400">(select all that apply)</span></label>
              <div className="flex flex-wrap gap-2">
                {PROCESS_STEPS.map(step => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => toggleSkill(step)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${teamForm.skills.includes(step) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
                  >
                    {step}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTeamOpen(false)}>Cancel</Button>
            <Button onClick={handleAddTeam} disabled={!teamForm.name || !teamForm.supervisor} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">Add Team</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team History Dialog */}
      <Dialog open={viewDialogOpen && !!selectedTeam} onOpenChange={() => setViewDialogOpen(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedTeam && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  {selectedTeam.name} — Assignment History
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {/* Team Info */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className={`text-xl font-bold ${efficiencyColor(selectedTeam.efficiency)}`}>{selectedTeam.efficiency}%</p>
                    <p className="text-xs text-slate-400">Efficiency</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-slate-800">{selectedTeam.members.length}</p>
                    <p className="text-xs text-slate-400">Members</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-slate-800">{selectedTeam.assignmentStats?.total || 0}</p>
                    <p className="text-xs text-slate-400">Total Assignments</p>
                  </div>
                </div>

                {/* All Assignments (most recent 100) */}
                {teamHistoryLoading ? (
                  <p className="text-slate-400 text-center py-8">Loading history...</p>
                ) : selectedTeamAssignments.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No assignments yet for this team.</p>
                ) : (
                  <table className="w-full text-sm border border-slate-100 rounded-lg overflow-hidden">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Order</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Machine</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Process</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Start</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">End</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTeamAssignments.map((a, i) => (
                        <tr key={i} className="border-t border-slate-50 hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-mono text-xs text-blue-700 font-bold">{a.orderId}</td>
                          <td className="px-4 py-2.5 text-xs text-slate-700">{a.machineName}</td>
                          <td className="px-4 py-2.5 text-xs font-semibold text-slate-800">{a.step}</td>
                          <td className="px-4 py-2.5 text-xs text-slate-500">{a.startDate || '—'}</td>
                          <td className="px-4 py-2.5 text-xs text-slate-500">{a.endDate || '—'}</td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              a.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                              a.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                              a.status === 'QC Pending' ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-500'}`}>{a.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
