export const emailApi = {
  send: async ({ to, subject, message, department, files = [], refModel, refId }) => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('to', to);
    formData.append('subject', subject);
    formData.append('message', message || '');
    formData.append('department', department);
    if (refModel) formData.append('refModel', refModel);
    if (refId) formData.append('refId', refId);
    files.forEach((file) => formData.append('attachments', file));

    const res = await fetch('/api/email/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // No Content-Type — browser sets multipart boundary automatically
      },
      body: formData
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new Error(data.message || 'Failed to send email');
      error.status = res.status;
      throw error;
    }
    return data;
  },
};
