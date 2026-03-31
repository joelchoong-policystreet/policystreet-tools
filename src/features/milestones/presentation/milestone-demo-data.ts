/** Demo shape for the Milestones UI; replace with Supabase models when wired. */

export type DemoMilestoneStatus =
  | "not_started"
  | "in_progress"
  | "at_risk"
  | "dropped"
  | "postponed"
  | "merged"
  | "completed";

export type DemoChecklistItem = {
  id: string;
  label: string;
  completed: boolean;
  /** ISO date when marked complete */
  completedOn?: string;
};

export type DemoTask = {
  id: string;
  title: string;
  dueLabel: string;
  /** ISO date for editing */
  dueDate: string;
  checklist: DemoChecklistItem[];
};

export type DemoMilestone = {
  id: string;
  title: string;
  description: string;
  listPreview: string;
  tier: "major" | "minor";
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  year: number;
  status: DemoMilestoneStatus;
  dueDate: string;
  driver: string;
  department: string;
  tags: string[];
  externalUrl?: string;
  tasks: DemoTask[];
};

export const DEMO_MILESTONES: DemoMilestone[] = [
  {
    id: "1",
    title: "Product Vision",
    listPreview: "Define the north-star vision for the super-app experience.",
    description:
      "Align stakeholders on a single product narrative for the next 18 months. This milestone captures the strategic pillars, target outcomes, and how we measure success across teams.",
    tier: "major",
    quarter: "Q1",
    year: 2026,
    status: "in_progress",
    dueDate: "2026-03-31",
    driver: "Joel",
    department: "Product",
    tags: ["Product", "Super-app"],
    externalUrl: "https://example.com",
    tasks: [
      {
        id: "t1",
        title: "Drafting product vision",
        dueLabel: "Mar 31, 2026",
        dueDate: "2026-03-31",
        checklist: [
          {
            id: "c1",
            label: "Conducting user research and synthesizing insights",
            completed: true,
            completedOn: "2026-03-15",
          },
          { id: "c2", label: "Build Execution Roadmap", completed: false },
        ],
      },
    ],
  },
  {
    id: "2",
    title: "Carsome insurer comparison",
    listPreview: "Benchmark pricing and coverage flows against key competitors.",
    description:
      "Document insurer comparison journeys and highlight gaps we can close in quoting and issuance.",
    tier: "minor",
    quarter: "Q1",
    year: 2026,
    status: "in_progress",
    dueDate: "2026-04-15",
    driver: "Joel",
    department: "Product",
    tags: ["Partnerships"],
    tasks: [],
  },
  {
    id: "3",
    title: "iMotorbike enhancement",
    listPreview: "Ship billing verification improvements for the affiliate workflow.",
    description:
      "Reduce manual verification steps by tightening OCR match rules and surfacing exceptions earlier.",
    tier: "major",
    quarter: "Q1",
    year: 2026,
    status: "completed",
    dueDate: "2026-02-28",
    driver: "Sarah",
    department: "Engineering",
    tags: ["Workflow"],
    tasks: [],
  },
];
