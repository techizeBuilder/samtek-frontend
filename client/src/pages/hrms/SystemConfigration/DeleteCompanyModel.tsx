/** @format */

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  companyName?: string;
}

const DeleteCompanyModal = ({
  isOpen,
  onClose,
  onConfirm,
  companyName,
}: Props) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-sm rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-3 text-red-600">
          Delete Company
        </h2>

        <p className="text-sm text-gray-600 mb-6">
          Are you sure you want to delete{" "}
          <span className="font-semibold">{companyName || "this company"}</span>
          ? <br />
          This action cannot be undone.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteCompanyModal;
