/** @format */

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CRMHeaderUserInfoProps {
  name?: string;
  role?: string;
  profilePicture?: string;
}

export const CRMHeaderUserInfo: React.FC<CRMHeaderUserInfoProps> = ({
  name,
  role,
  profilePicture,
}) => {
  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-9 w-9 border border-slate-200 shadow-sm">
        <AvatarImage src={profilePicture} alt={name} />
        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xs">
          {name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "U"}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className="text-sm font-bold text-slate-900 leading-none mb-1">
          {name || "User Account"}
        </span>
        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none">
          {role || "No Role Assigned"}
        </span>
      </div>
    </div>
  );
};
