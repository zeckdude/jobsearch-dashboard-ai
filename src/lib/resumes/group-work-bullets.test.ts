import { describe, expect, it } from "vitest";
import { buildWorkHistoryGroups } from "@/lib/resumes/group-work-bullets";

describe("buildWorkHistoryGroups", () => {
  it("groups bullets under work experience with dates", () => {
    const groups = buildWorkHistoryGroups(
      [
        { company: "Aerospike", title: "Senior Engineer", startDate: "01/2022", endDate: "03/2024", createdAt: "2024-01-01" },
        { company: "Dave.com", title: "Full-stack Engineer", startDate: "03/2018", endDate: "10/2019", createdAt: "2023-01-01" },
      ],
      [
        { id: "1", company: "Aerospike", role: "Senior Engineer", text: "Built dashboards.", truthLevel: "verified", category: "frontend" },
        { id: "2", company: "Aerospike", role: "Senior Engineer", text: "Led testing.", truthLevel: "verified", category: "testing" },
        { id: "3", company: "Dave.com", role: "Full-stack Engineer", text: "Shipped support tools.", truthLevel: "verified", category: "fullstack" },
      ],
    );

    expect(groups).toHaveLength(2);
    expect(groups[0]?.company).toBe("Aerospike");
    expect(groups[0]?.bullets).toHaveLength(2);
    expect(groups[0]?.startDate).toBe("01/2022");
    expect(groups[1]?.company).toBe("Dave.com");
  });

  it("includes bullet-only roles without work experience rows", () => {
    const groups = buildWorkHistoryGroups(
      [],
      [{ id: "1", company: "Acme", role: "Engineer", text: "Did work.", truthLevel: "verified", category: "frontend" }],
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]?.company).toBe("Acme");
    expect(groups[0]?.bullets).toHaveLength(1);
  });
});
