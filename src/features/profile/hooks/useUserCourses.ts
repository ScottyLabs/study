"use client";

import { useEffect, useState } from "react";
import { addCourseCode, deleteCourseCode, fetchCourseCodes } from "../services/profileApi";
import { getAllCourses } from "../services/profileService";
import type { Course } from "../types";

export function useUserCourses(userId?: string) {
  const [classes, setClasses] = useState<Course[]>([]);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    void Promise.all([fetchCourseCodes(), getAllCourses()])
      .then(([courseCodes, catalog]) => {
        if (cancelled) return;
        const catalogByCode = new Map(catalog.map((course) => [course.courseID, course]));
        setClasses(
          courseCodes.map(
            (courseCode) =>
              catalogByCode.get(courseCode) ?? {
                id: courseCode,
                name: "",
                courseID: courseCode,
              },
          ),
        );
      })
      .catch((error) => console.error("Error getting courses:", error));

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const addCourse = async (course: Course) => {
    if (!userId) return;
    await addCourseCode(course.courseID);
  };

  const deleteCourse = async (courseID: string) => {
    if (!userId) return;
    await deleteCourseCode(courseID);
    setClasses((currentClasses) => currentClasses.filter((course) => course.courseID !== courseID));
  };

  return { classes, setClasses, addCourse, deleteCourse };
}
