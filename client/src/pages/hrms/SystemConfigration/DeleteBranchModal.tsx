/** @format */

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    branchName?: string;
}

const DeleteBranchModal = ({
    isOpen,
    onClose,
    onConfirm,
    branchName,
}: Props) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
            <div className="bg-white w-full max-w-sm rounded-lg p-6 shadow-xl">
                <h2 className="text-lg font-semibold mb-3 text-red-600">
                    Delete Branch
                </h2>

                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                    Are you sure you want to delete{" "}
                    <span className="font-semibold">{branchName || "this branch"}</span>
                    ? <br />
                    This action cannot be undone.
                </p>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-500 text-white rounded-md text-sm font-medium hover:bg-red-600 transition-colors"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteBranchModal;
