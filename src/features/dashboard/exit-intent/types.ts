export type GroupKey = "pri" | "price" | "bug" | "req" | "ux" | "other";

export type Cluster = {
  code: string;
  name: string;
  groupKey: GroupKey;
  isPriority: boolean;
  sortOrder: number;
  /** Plain-English explanation shown behind the info icon. */
  description: string | null;
};

export type Subcluster = {
  id: number;
  clusterCode: string;
  name: string;
  sortOrder: number;
  /** Plain-English explanation shown behind the info icon. */
  description: string | null;
};

export type Submission = {
  key: string;
  submittedAt: Date;
  /** Calendar day in Asia/Kuala_Lumpur, YYYY-MM-DD. */
  day: string;
  /** Calendar month in Asia/Kuala_Lumpur, YYYY-MM. */
  month: string;
  quotationUrl: string | null;
  customerCategory: string | null;
  feedback: string;
  gloss: string | null;
  clusterCode: string;
  subclusterId: number | null;
  tagNote: string | null;
};

export type NoteItem = { h: string; b: string };

export type MonthNote = {
  /** YYYY-MM */
  month: string;
  title: string;
  subtitle: string | null;
  items: NoteItem[];
  asOf: Date;
  isFinal: boolean;
};

export type SyncRun = { ranAt: Date; rowsInserted: number; caughtUp: boolean };

export type Granularity = "day" | "week" | "month";

/** "this_month" | "previous_month" | "all" | "month:YYYY-MM" */
export type PeriodKey = string;

export type Period = {
  key: PeriodKey;
  label: string;
  /** Months (YYYY-MM) covered by the period. */
  months: string[];
  /** Inclusive day range actually covered by data, YYYY-MM-DD. */
  fromDay: string;
  toDay: string;
  days: number;
  /** Single-month periods only. */
  month: string | null;
};
