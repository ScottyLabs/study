import axios from "axios";
import { describe, expect, it, vi } from "vitest";

import { getAllCourses } from "./profileService";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

describe("getAllCourses", () => {
  it("uses the current ScottyLabs course API", async () => {
    const courses = [
      { id: "15112", courseID: "15-112", name: "Fundamentals of Programming" },
    ];
    vi.mocked(axios.get).mockResolvedValue({ data: courses });

    await expect(getAllCourses()).resolves.toEqual(courses);
    expect(axios.get).toHaveBeenCalledWith(
      "https://course.apis.scottylabs.org/courses/all",
    );
  });
});
