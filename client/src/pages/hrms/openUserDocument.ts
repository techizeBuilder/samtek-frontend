/** @format */

import axios from "axios";
import { toast } from "@/pages/Alert/Toast";

const API = import.meta.env.VITE_API_URL;

// Aadhaar, PAN and the like aren't public files, so a plain link can't open them:
// it can't carry the login. This fetches the file with the login and opens it.
// The tab is opened first, because a browser blocks one opened after waiting.
export async function openUserDocument(docId: string) {
  const tab = window.open("", "_blank");
  try {
    const res = await axios.get(`${API}/documents/file/${docId}`, {
      responseType: "blob",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    const url = URL.createObjectURL(res.data);
    if (tab) tab.location.href = url;
    else window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error: any) {
    if (tab) tab.close();
    toast({
      type: "error",
      title: "Could Not Open Document",
      message: error?.response?.status === 403
        ? "You don't have access to this document."
        : "Please try again.",
    });
  }
}
