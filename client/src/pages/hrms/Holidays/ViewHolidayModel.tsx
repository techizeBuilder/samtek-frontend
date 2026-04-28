/** @format */

import { X, Calendar as CalendarIcon, Clock, MapPin, ShieldCheck, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Holiday {
  title: string;
  date: string;
  day: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  holiday: Holiday | null;
}

const ViewHolidayModal = ({ isOpen, onClose, holiday }: Props) => {
  if (!isOpen || !holiday) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* BACKDROP */}
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* MODAL */}
      <div
        className="relative z-10 w-full max-w-lg rounded-[2.5rem] bg-white p-10 shadow-3xl overflow-hidden ring-1 ring-gray-100 animate-in fade-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-orange-50 rounded-full translate-x-24 -translate-y-24 blur-3xl opacity-60" />

        <button
          onClick={onClose}
          className="absolute top-8 right-8 text-gray-400 hover:text-gray-900 transition-colors p-2 hover:bg-gray-50 rounded-xl"
        >
          <X size={20} />
        </button>

        <div className="mb-10 text-center">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-orange-500 shadow-xl border border-gray-50 mx-auto mb-4">
            <ShieldCheck size={28} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
            Observance Audit
          </h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-2 italic">Official Infrastructure Log</p>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-50/50 rounded-3xl p-6 border border-gray-100 flex items-start gap-5">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-orange-500 shadow-sm border border-gray-50 shrink-0">
              <MapPin size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Designation</p>
              <p className="font-black text-lg text-gray-900 uppercase tracking-tight leading-tight">{holiday.title}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-orange-50/50 rounded-3xl p-6 border border-orange-100 flex items-start gap-4">
              <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-orange-500 shadow-sm border border-orange-100 shrink-0">
                <CalendarIcon size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Chronology</p>
                <p className="font-black text-xs text-gray-800 uppercase tabular-nums">
                  {new Date(holiday.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="bg-gray-50/50 rounded-3xl p-6 border border-gray-100 flex items-start gap-4">
              <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-gray-400 shadow-sm border border-gray-50 shrink-0">
                <Clock size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Weekday</p>
                <p className="font-black text-xs text-gray-800 uppercase">{holiday.day}</p>
              </div>
            </div>
          </div>

          <div className="pt-8">
            <Button
              onClick={onClose}
              className="w-full h-14 rounded-2xl bg-gray-900 hover:bg-black text-white font-black text-xs uppercase tracking-widest shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              Close Audit <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewHolidayModal;
