export const BRANCHES = ["Maya", "Kayabwe", "Mpambire"] as const;

export const MEMBER_STATUS = {
  visitor: "Visitor",
  regular: "Regular attender",
  member: "Member",
  inactive: "Inactive",
  transferred: "Transferred",
  deceased: "Deceased",
} as const;
export type MemberStatus = keyof typeof MEMBER_STATUS;

export const MARITAL_STATUS = {
  single: "Single",
  married: "Married",
  widowed: "Widowed",
  divorced: "Divorced",
  separated: "Separated",
} as const;

export const HOUSEHOLD_ROLE = {
  head: "Head",
  spouse: "Spouse",
  child: "Child",
  relative: "Relative",
  other: "Other",
} as const;

export const MINISTER_STATUS = {
  active: "Active",
  on_leave: "On leave",
  retired: "Retired",
  transferred: "Transferred",
  deceased: "Deceased",
} as const;

export const PAY_METHOD = {
  cash: "Cash",
  mtn_momo: "MTN MoMo",
  airtel_money: "Airtel Money",
  bank: "Bank",
  cheque: "Cheque",
  other: "Other",
} as const;
export type PayMethod = keyof typeof PAY_METHOD;

export const SERVICES = [
  "Sunday Morning Service",
  "Sunday Main Service",
  "Wednesday Deliverance Service",
  "Conference",
  "Crusade",
  "Other",
];

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Who appears in each kind of milestone, in order. `many` roles get two slots.
export const MILESTONE_KINDS = {
  baptism: {
    label: "Baptism",
    plural: "Baptisms",
    roles: [{ role: "candidate", label: "Baptised" }],
  },
  wedding: {
    label: "Wedding",
    plural: "Weddings",
    roles: [
      { role: "groom", label: "Groom" },
      { role: "bride", label: "Bride" },
      { role: "witness", label: "Witness", many: true },
    ],
  },
  dedication: {
    label: "Child dedication",
    plural: "Dedications",
    roles: [
      { role: "child", label: "Child" },
      { role: "father", label: "Father" },
      { role: "mother", label: "Mother" },
    ],
  },
  funeral: {
    label: "Funeral",
    plural: "Funerals",
    roles: [{ role: "deceased", label: "Deceased" }],
  },
} as const satisfies Record<
  string,
  { label: string; plural: string; roles: readonly { role: string; label: string; many?: boolean }[] }
>;
export type MilestoneKind = keyof typeof MILESTONE_KINDS;
export const isMilestoneKind = (v: unknown): v is MilestoneKind =>
  typeof v === "string" && v in MILESTONE_KINDS;
