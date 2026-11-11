/** @format */
// "How pay is worked out" (2026-11-11), in English or Hinglish. The rules are the
// server's: services/payroll/payrollCalc.js and docs/client-features-2026-11/02c-payroll-logic.md.
import { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";

export const DAY_LABELS: Record<string, string> = {
  weeklyOff: "Weekly off",
  notJoined: "Before joining",
  notYet: "Still to come",
  paidHoliday: "Paid holiday",
  unpaidHoliday: "Unpaid holiday",
  present: "Present",
  halfDay: "Half day",
  paidLeave: "Paid leave",
  unpaidLeave: "Unpaid leave",
  absent: "Absent",
};

const TEXT = {
  en: {
    title: "How pay is worked out",
    rules: [
      "Salary is for working days only. A weekly off (Sunday, or the device's WO) isn't a working day: it isn't paid and isn't absence.",
      "Paid: present (full day), half day (half a day), approved paid leave, and a holiday marked Paid.",
      "Loss of pay: absent, unpaid leave, and the other half of a half day with no leave.",
      "Not counted at all: days before joining, days still to come, and a holiday marked Unpaid.",
    ],
    formula: [
      "Working days = days in the month − weekly offs",
      "Earned = monthly gross × pay days ÷ working days",
      "Net = earned − PF − professional tax − TDS − advance − others",
    ],
  },
  hi: {
    title: "Pay ka hisaab kaise hota hai",
    rules: [
      "Salary sirf working days ki hai. Weekly off (Sunday, ya device ka WO) working day nahi hai: na pay milti hai, na absent gina jaata hai.",
      "Pay milti hai: present (poora din), half day (aadha din), approved paid leave, aur Paid holiday.",
      "Pay kategi (LOP): absent, unpaid leave, aur half day ka baaki aadha din agar leave nahi hai.",
      "Gina hi nahi jaata: joining se pehle ke din, aane wale din, aur Unpaid holiday.",
    ],
    formula: [
      "Working days = mahine ke din − weekly off",
      "Earned = monthly gross × pay days ÷ working days",
      "Net = earned − PF − professional tax − TDS − advance − others",
    ],
  },
};

export default function PayExplainer() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<"en" | "hi">("en");
  const t = TEXT[lang];

  return (
    <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-blue-800"
      >
        <span className="flex items-center gap-2"><Info size={16} /> {t.title}</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-gray-700 space-y-3">
          <div className="flex gap-1">
            {(["en", "hi"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`px-3 py-1 rounded-md text-xs font-semibold border ${lang === l ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200"}`}
              >
                {l === "en" ? "English" : "Hinglish"}
              </button>
            ))}
          </div>
          <ul className="list-disc pl-5 space-y-1">
            {t.rules.map((r) => <li key={r}>{r}</li>)}
          </ul>
          <div className="rounded-md bg-white border px-3 py-2 font-mono text-xs space-y-1">
            {t.formula.map((f) => <div key={f}>{f}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}
