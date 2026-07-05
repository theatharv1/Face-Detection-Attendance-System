import {
  mdiAccountPlusOutline,
  mdiFaceRecognition,
  mdiCalendarCheckOutline,
} from "@mdi/js";

export const NAV = [
  {
    to: "/",
    end: true,
    label: "Enrollment",
    icon: mdiAccountPlusOutline,
    title: "Enrollment",
    desc: "Register a person once — the system encodes their face and recognizes them from then on.",
    eyebrow: "People",
  },
  {
    to: "/recognition",
    label: "Live Recognition",
    icon: mdiFaceRecognition,
    title: "Live Recognition",
    desc: "Scan a room in real time. Recognized people are marked present automatically.",
    eyebrow: "Sessions",
  },
  {
    to: "/attendance",
    label: "Attendance",
    icon: mdiCalendarCheckOutline,
    title: "Attendance",
    desc: "Review who was marked present on any given day.",
    eyebrow: "Records",
  },
];
