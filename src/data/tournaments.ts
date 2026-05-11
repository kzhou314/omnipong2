export type TournamentStatus = "open" | "waitlist" | "closed";

export type Tournament = {
  id: string;
  name: string;
  city: string;
  region: string;
  startDate: string;
  endDate: string;
  skillBand: string;
  format: string;
  entries: number;
  cap: number;
  status: TournamentStatus;
};

export const tournaments: Tournament[] = [
  {
    id: "tt-001",
    name: "Spring Open Singles",
    city: "Portland",
    region: "OR",
    startDate: "2026-06-07",
    endDate: "2026-06-08",
    skillBand: "Open — USATT 1600+",
    format: "Single elimination + consolation",
    entries: 42,
    cap: 64,
    status: "open",
  },
  {
    id: "tt-002",
    name: "Metro League Round Robin",
    city: "Seattle",
    region: "WA",
    startDate: "2026-06-14",
    endDate: "2026-06-14",
    skillBand: "B/C division split",
    format: "Round robin pools → playoffs",
    entries: 36,
    cap: 40,
    status: "waitlist",
  },
  {
    id: "tt-003",
    name: "Junior Challenge Cup",
    city: "San Jose",
    region: "CA",
    startDate: "2026-07-19",
    endDate: "2026-07-20",
    skillBand: "U18 — rated & unrated tracks",
    format: "Groups + knockout",
    entries: 28,
    cap: 48,
    status: "open",
  },
  {
    id: "tt-004",
    name: "Corporate Smash Night",
    city: "Austin",
    region: "TX",
    startDate: "2026-05-30",
    endDate: "2026-05-30",
    skillBand: "Fun / beginner friendly",
    format: "Doubles ladder",
    entries: 24,
    cap: 24,
    status: "closed",
  },
];
