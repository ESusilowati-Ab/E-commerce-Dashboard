// Sample HR dataset generator for first-load demo
import type { DataRow } from "../types";

const departments = [
  "Engineering",
  "Sales",
  "Marketing",
  "Finance",
  "HR",
  "Operations",
  "Design",
];
const cities = [
  "New York",
  "San Francisco",
  "London",
  "Berlin",
  "Tokyo",
  "Sydney",
  "Toronto",
];
const genders = ["Male", "Female", "Non-binary"];
const levels = ["Junior", "Mid", "Senior", "Lead", "Manager", "Director"];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function generateSampleDataset(n: number = 500): {
  rows: DataRow[];
  columns: string[];
} {
  const rand = seededRandom(42);
  const rows: DataRow[] = [];
  const columns = [
    "EmployeeID",
    "Name",
    "Department",
    "City",
    "Gender",
    "Level",
    "YearsExperience",
    "Salary",
    "Age",
    "HireDate",
    "PerformanceScore",
    "Bonus",
  ];

  const firstNames = [
    "Alex",
    "Sam",
    "Jordan",
    "Taylor",
    "Morgan",
    "Casey",
    "Riley",
    "Avery",
    "Quinn",
    "Drew",
    "Sasha",
    "Reese",
    "Cameron",
    "Jamie",
    "Skylar",
  ];
  const lastNames = [
    "Smith",
    "Johnson",
    "Lee",
    "Patel",
    "Garcia",
    "Kim",
    "Brown",
    "Davis",
    "Wilson",
    "Chen",
    "Singh",
    "Lopez",
    "Wang",
    "Martinez",
    "Anderson",
  ];

  for (let i = 0; i < n; i++) {
    const dept = departments[Math.floor(rand() * departments.length)];
    const level = levels[Math.floor(rand() * levels.length)];
    const yearsExp = Math.floor(rand() * 25);
    const baseSalary =
      40000 +
      yearsExp * 4500 +
      (level === "Director"
        ? 80000
        : level === "Manager"
          ? 50000
          : level === "Lead"
            ? 30000
            : level === "Senior"
              ? 15000
              : 0);
    const deptMultiplier =
      dept === "Engineering"
        ? 1.25
        : dept === "Finance"
          ? 1.15
          : dept === "Sales"
            ? 1.1
            : 1;
    const salary = Math.round(
      baseSalary * deptMultiplier + (rand() - 0.5) * 10000,
    );
    const age = 22 + Math.floor(rand() * 40);
    const year = 2015 + Math.floor(rand() * 10);
    const month = 1 + Math.floor(rand() * 12);
    const day = 1 + Math.floor(rand() * 28);
    const perf = Math.round((60 + rand() * 40) * 10) / 10;
    const bonus = Math.round(salary * (0.05 + rand() * 0.15));

    // inject some missing values (~3%)
    const row: DataRow = {
      EmployeeID: `EMP${String(1001 + i).padStart(5, "0")}`,
      Name: `${firstNames[Math.floor(rand() * firstNames.length)]} ${lastNames[Math.floor(rand() * lastNames.length)]}`,
      Department: dept,
      City: cities[Math.floor(rand() * cities.length)],
      Gender:
        rand() > 0.95 ? null : genders[Math.floor(rand() * genders.length)],
      Level: level,
      YearsExperience: yearsExp,
      Salary: salary,
      Age: rand() > 0.98 ? null : age,
      HireDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      PerformanceScore: perf,
      Bonus: bonus,
    };
    rows.push(row);
  }

  // inject a few duplicates
  rows.push({ ...rows[0] });
  rows.push({ ...rows[1] });

  return { rows, columns };
}
