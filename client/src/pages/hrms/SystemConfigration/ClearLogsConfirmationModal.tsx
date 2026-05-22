/** @format */

import { Trash2 } from "lucide-react";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading?: boolean;
}

const ClearLogsConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    isLoading = false,
}: Props) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <Trash2 size={24} />
                </div>

                <h2 className="text-xl font-bold text-center text-gray-900 mb-2">
                    Clear Audit Logs?
                </h2>

                <p className="text-sm text-center text-gray-500 mb-8 leading-relaxed">
                    Are you absolutely sure you want to delete **ALL** activity logs? This action is permanent and cannot be undone.
                </p>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Clearing...
                            </>
                        ) : (
                            "Yes, Clear All"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ClearLogsConfirmationModal;
