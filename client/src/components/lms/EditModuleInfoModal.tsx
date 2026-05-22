import React, { useState, useEffect } from 'react';
import { useUpdateTrainingModule } from '../../hooks/useTraining';

interface EditModuleInfoModalProps {
  module: any | null;
  onClose: () => void;
}

const CATEGORIES = ["Induction", "SOP", "Reporting", "ERP Usage", "Professional / Behavioral", "Task Management", "Skill", "Safety", "Customer Relationship", "Sales", "Product", "Demo"];

export default function EditModuleInfoModal({ module, onClose }: EditModuleInfoModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [sequenceOrder, setSequenceOrder] = useState<number | ''>('');

  const { mutate: updateModule, isPending } = useUpdateTrainingModule();

  useEffect(() => {
    if (module) {
      setTitle(module.title || '');
      setDescription(module.description || '');
      setCategory(module.category || '');
      setSequenceOrder(module.sequenceOrder || '');
    }
  }, [module]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!module || !title || !category || sequenceOrder === '') return;

    updateModule({
      id: module._id,
      payload: { title, description, category, sequenceOrder }
    }, {
      onSuccess: () => onClose()
    });
  };

  if (!module) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={!isPending ? onClose : undefined}></div>
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg m-4 flex flex-col">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Edit Module Info</h2>
          <button onClick={onClose} disabled={isPending} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Module Title *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 w-full rounded-md border-gray-300 p-2 border" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 w-full rounded-md border-gray-300 p-2 border" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Category *</label>
              <select value={category} onChange={e => setCategory(e.target.value)} required className="mt-1 w-full rounded-md border-gray-300 p-2 border">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Sequence Order *</label>
              <input type="number" min="1" value={sequenceOrder} onChange={e => setSequenceOrder(parseInt(e.target.value))} required className="mt-1 w-full rounded-md border-gray-300 p-2 border" />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={isPending} className="px-4 py-2 border rounded-md text-gray-700 bg-white hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isPending} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}