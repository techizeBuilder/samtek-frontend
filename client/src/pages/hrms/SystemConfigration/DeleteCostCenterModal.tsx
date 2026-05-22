/** @format */

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    costCenterName?: string;
}

export default function DeleteCostCenterModal({
    isOpen,
    onClose,
    onConfirm,
    costCenterName,
}: Props) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white w-full max-w-sm rounded-lg p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-lg font-semibold text-gray-900">Confirm Deletion</h2>
                <p className="text-sm text-gray-500 mt-2">
                    Are you sure you want to delete the cost center{" "}
                    <span className="font-semibold text-gray-900">
                        "{costCenterName}"
                    </span>
                    ? This action cannot be undone.
                </p>

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border rounded text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-500 text-white rounded text-sm font-medium hover:bg-red-600 transition-colors"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
