import type { SvgIconComponent } from "@mui/icons-material";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import AutoFixHighOutlinedIcon from "@mui/icons-material/AutoFixHighOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import BoltOutlinedIcon from "@mui/icons-material/BoltOutlined";
import ChecklistRtlOutlinedIcon from "@mui/icons-material/ChecklistRtlOutlined";
import ConnectWithoutContactOutlinedIcon from "@mui/icons-material/ConnectWithoutContactOutlined";
import ContactPageOutlinedIcon from "@mui/icons-material/ContactPageOutlined";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import ManageSearchOutlinedIcon from "@mui/icons-material/ManageSearchOutlined";
import MarkChatUnreadOutlinedIcon from "@mui/icons-material/MarkChatUnreadOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import PsychologyOutlinedIcon from "@mui/icons-material/PsychologyOutlined";
import RocketLaunchOutlinedIcon from "@mui/icons-material/RocketLaunchOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import SourceOutlinedIcon from "@mui/icons-material/SourceOutlined";
import TodayOutlinedIcon from "@mui/icons-material/TodayOutlined";
import TravelExploreOutlinedIcon from "@mui/icons-material/TravelExploreOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import StarOutlineOutlinedIcon from "@mui/icons-material/StarOutlineOutlined";
import WorkOutlineOutlinedIcon from "@mui/icons-material/WorkOutlineOutlined";

export type NavItem = {
  href: string;
  label: string;
  eyebrow: string;
  icon: SvgIconComponent;
  match?: (pathname: string) => boolean;
};

export type NavSection = {
  id: string;
  label: string;
  eyebrow: string;
  icon: SvgIconComponent;
  items: NavItem[];
};

export function isNavItemActive(pathname: string, item: NavItem) {
  if (item.match) return item.match(pathname);
  if (pathname === item.href) return true;

  switch (item.href) {
    case "/applications":
      return /^\/applications\/(?!assistant|field-learning)[^/]+/.test(pathname);
    case "/resume":
      return pathname === "/resume";
    case "/dashboard":
    case "/needs-me":
    case "/daily-workflow":
      return false;
    default:
      return pathname.startsWith(`${item.href}/`);
  }
}

export function findActiveNavItem(pathname: string) {
  for (const section of navSections) {
    const item = section.items.find((entry) => isNavItemActive(pathname, entry));
    if (item) return { section, item };
  }
  return null;
}

export function sectionHasActiveItem(pathname: string, section: NavSection) {
  return section.items.some((item) => isNavItemActive(pathname, item));
}

export const navSections: NavSection[] = [
  {
    id: "today",
    label: "Today",
    eyebrow: "Command surface",
    icon: TodayOutlinedIcon,
    items: [
      { href: "/dashboard", label: "Command Center", eyebrow: "Home", icon: DashboardOutlinedIcon },
      { href: "/needs-me", label: "Needs Me", eyebrow: "Agent blockers", icon: MarkChatUnreadOutlinedIcon },
      { href: "/agents", label: "Agent Board", eyebrow: "Review & QA", icon: AutoFixHighOutlinedIcon },
      { href: "/daily-workflow", label: "Daily Workflow", eyebrow: "Habit tracker", icon: ChecklistRtlOutlinedIcon },
    ],
  },
  {
    id: "jobs",
    label: "Jobs",
    eyebrow: "Review & save",
    icon: WorkOutlineOutlinedIcon,
    items: [
      {
        href: "/jobs",
        label: "Review Matches",
        eyebrow: "Full & partial queue",
        icon: ChecklistRtlOutlinedIcon,
        match: (pathname) => pathname === "/jobs" || (pathname.startsWith("/jobs/") && !pathname.startsWith("/jobs/favorites")),
      },
      {
        href: "/jobs/favorites",
        label: "Favorites",
        eyebrow: "Saved listings",
        icon: StarOutlineOutlinedIcon,
      },
    ],
  },
  {
    id: "discover",
    label: "Discover",
    eyebrow: "Find opportunities",
    icon: TravelExploreOutlinedIcon,
    items: [
      { href: "/profiles", label: "Search Profiles", eyebrow: "Manage campaigns", icon: ManageSearchOutlinedIcon },
      { href: "/sources", label: "Company Sources", eyebrow: "Discovery channels", icon: SourceOutlinedIcon },
      { href: "/runs", label: "Search Runs", eyebrow: "Run history", icon: HistoryOutlinedIcon },
    ],
  },
  {
    id: "prepare",
    label: "Prepare",
    eyebrow: "Build your packet",
    icon: DescriptionOutlinedIcon,
    items: [
      { href: "/resume", label: "Resume", eyebrow: "Edit & preview", icon: DescriptionOutlinedIcon },
      {
        href: "/resumes/generated",
        label: "Generated",
        eyebrow: "Per-job materials",
        icon: ArticleOutlinedIcon,
      },
      {
        href: "/resumes/custom-opportunity",
        label: "Custom Opportunity",
        eyebrow: "Recruiter brief",
        icon: ContactPageOutlinedIcon,
      },
      {
        href: "/resumes/variants",
        label: "Variants",
        eyebrow: "Positioning profiles",
        icon: AutoAwesomeOutlinedIcon,
      },
      { href: "/evidence", label: "Evidence", eyebrow: "Verified facts", icon: FactCheckOutlinedIcon },
    ],
  },
  {
    id: "apply",
    label: "Apply",
    eyebrow: "Execute & track",
    icon: RocketLaunchOutlinedIcon,
    items: [
      { href: "/applications/assistant", label: "Apply Sprint", eyebrow: "Run agent", icon: BoltOutlinedIcon },
      { href: "/applications/field-learning", label: "Field Learning", eyebrow: "Review autofill", icon: PsychologyOutlinedIcon },
      { href: "/applications", label: "Applications", eyebrow: "Track outcomes", icon: AssignmentTurnedInOutlinedIcon },
      { href: "/outcomes", label: "Outcomes", eyebrow: "Quality signals", icon: BarChartOutlinedIcon },
      { href: "/networking", label: "Networking", eyebrow: "Outreach plans", icon: ConnectWithoutContactOutlinedIcon },
    ],
  },
  {
    id: "system",
    label: "System",
    eyebrow: "Configure & learn",
    icon: TuneOutlinedIcon,
    items: [
      { href: "/settings", label: "Settings", eyebrow: "Configure", icon: SettingsOutlinedIcon },
      { href: "/guide", label: "User Guide", eyebrow: "How to use this", icon: MenuBookOutlinedIcon },
    ],
  },
];

export const flatNavItems = navSections.flatMap((section) => section.items);
