import React, { useState } from 'react';
import { useServicemen, useUpdateTechnician } from '@/hooks/useComplaints';
import { Search, MapPin, Wrench, Phone, Edit, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';

export default function MyTechnicians() {
  const { hasFeatureAccess } = usePermissions();
  const canEdit = hasFeatureAccess('complaints', 'technicians', 'edit');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');

  const { data: response, isLoading, isError } = useServicemen(statusFilter || undefined, zoneFilter || undefined);
  const technicians = response?.data || [];
  
  // local filter for search term
  const filteredTechnicians = technicians.filter((tech: any) => 
    tech.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (tech.contact && tech.contact.includes(searchTerm))
  );

  const [editingTech, setEditingTech] = useState<any>(null);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Technicians</h1>
          <p className="text-sm text-gray-500">Manage and track your service team's zones and skills.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by name or contact..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select 
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-600 bg-white text-sm"
            value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Available">Available</option>
            <option value="On Job">On Job</option>
            <option value="Off Duty">Off Duty</option>
          </select>

          <input
              type="text"
              placeholder="Filter by Zone (e.g. North Zone)"
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-sm text-gray-600 bg-white"
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
      ) : isError ? (
        <div className="text-center text-red-500 py-10">Failed to load technicians.</div>
      ) : filteredTechnicians.length === 0 ? (
        <div className="text-center text-gray-500 py-10 bg-white rounded-xl border border-gray-100 shadow-sm">No technicians found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTechnicians.map((tech: any) => (
            <div key={tech._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
               <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-lg">
                        {tech.name.charAt(0).toUpperCase()}
                     </div>
                     <div>
                        <h3 className="font-bold text-gray-800">{tech.name}</h3>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                           <Phone size={12} /> {tech.contact}
                        </div>
                     </div>
                  </div>
                  {canEdit && (
                    <button onClick={() => setEditingTech(tech)} className="text-gray-400 hover:text-indigo-600 p-1.5 rounded-lg transition hover:bg-indigo-50" title="Edit Technician">
                      <Edit size={16} />
                    </button>
                  )}
               </div>
               
               <div className="space-y-3">
                  <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                     <span className="text-sm text-gray-500">Status</span>
                     <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${tech.currentStatus === 'Available' ? 'bg-green-100 text-green-700' : tech.currentStatus === 'On Job' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                        {tech.currentStatus || 'Available'}
                     </span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                     <span className="text-sm text-gray-500 flex items-center gap-1"><MapPin size={14} className="text-gray-400"/> Zone</span>
                     <span className="text-sm font-medium text-gray-800 truncate max-w-[150px]">{tech.serviceZone}</span>
                  </div>
                  <div>
                     <span className="text-sm text-gray-500 flex items-center gap-1 mb-2"><Wrench size={14} className="text-gray-400"/> Skills</span>
                     <div className="flex flex-wrap gap-1">
                        {tech.skills?.map((skill: string) => (
                           <span key={skill} className="px-2 py-1 bg-gray-50 border border-gray-100 text-gray-600 text-[10px] rounded-full font-medium">
                              {skill}
                           </span>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}

      {editingTech && (
        <EditTechModal tech={editingTech} onClose={() => setEditingTech(null)} />
      )}
    </div>
  );
}

function EditTechModal({ tech, onClose }: { tech: any; onClose: () => void }) {
  const { toast } = useToast();
  const { mutate: updateTech, isPending } = useUpdateTechnician();
  
  const [zone, setZone] = useState(tech.serviceZone || '');
  const [skills, setSkills] = useState<string[]>(tech.skills || []);

  const availableSkills = ['Breakdown', 'Performance Issue', 'Installation', 'Training'];

  const toggleSkill = (s: string) => {
    if (skills.includes(s)) {
      setSkills(skills.filter(sk => sk !== s));
    } else {
      setSkills([...skills, s]);
    }
  };

  const handleSave = () => {
    updateTech({ id: tech._id, payload: { serviceZone: zone, technicianSkills: skills } }, {
      onSuccess: () => {
        toast({ title: "Success", description: "Technician profile updated successfully." });
        onClose();
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err?.response?.data?.message || "Failed to update technician." });
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col"> 
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Edit Technician</h2>
            <p className="text-xs text-gray-500">{tech.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors"><X size={20}/></button>
        </div>
        
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Zone</label>
            <input 
              type="text" 
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              placeholder="e.g. North Zone"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Specialized Skills</label>
            <div className="flex flex-wrap gap-2">
              {availableSkills.map(skill => {
                const isSelected = skills.includes(skill);
                return (
                  <button
                    key={skill}
                    onClick={() => toggleSkill(skill)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                      isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-300 text-gray-600 hover:border-indigo-400'
                    }`}
                  >
                    {skill}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition">Cancel</button>
          <button onClick={handleSave} disabled={isPending} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50">
            {isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}