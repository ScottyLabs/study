import React, { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useUser } from "~/lib/auth-client";
import { getAllCourses } from "../services/profileService";
import { useUserCourses } from "../hooks/useUserCourses";
import type { Course } from "../types";
import { Plus, Search, Trash2 } from "lucide-react";

type CoursesProps = {
  userId?: string;
  classes: Course[];
  setClasses: Dispatch<SetStateAction<Course[]>>;
  addCourse: (course: Course) => Promise<void>;
};

// Typing "15112" searches for "15-112"
function courseSearchValue(query: string) {
  return /^\d{3}/u.test(query) ? `${query.slice(0, 2)}-${query.slice(2)}` : query;
}

function matchCourses(courses: Course[], searchValue: string, selected: Course[]) {
  const selectedIds = new Set(selected.map((course) => course.courseID));
  return courses
    .filter(
      (course) =>
        (course.name.toLowerCase().includes(searchValue) ||
          course.courseID.toLowerCase().includes(searchValue)) &&
        !selectedIds.has(course.courseID),
    )
    .slice(0, 10);
}

function useCourseCatalog() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    void getAllCourses()
      .then(setCourses)
      .catch((err: unknown) => {
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return { courses, loading };
}

function useCourseSearch({ userId, classes, setClasses, addCourse }: CoursesProps) {
  const { courses, loading } = useCourseCatalog();
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const updateFilteredCourses = (query: string, selectedClasses: Course[]) => {
    const normalizedQuery = query.trim();
    if (normalizedQuery === "") {
      setFilteredCourses([]);
      return;
    }
    const searchValue = courseSearchValue(normalizedQuery);
    if (searchValue !== normalizedQuery) setSearchQuery(searchValue);
    setFilteredCourses(matchCourses(courses, searchValue, selectedClasses));
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value.toLowerCase();
    setSearchQuery(query);
    updateFilteredCourses(query, classes);
  };

  const addClass = async (course: Course) => {
    if (userId === undefined || userId === "") return;
    try {
      await addCourse(course);
      const nextClasses = [...classes, course];
      setClasses(nextClasses);
      updateFilteredCourses(searchQuery, nextClasses);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const [firstFilteredCourse] = filteredCourses;
    if (event.key !== "Enter" || firstFilteredCourse === undefined) return;
    event.preventDefault();
    void addClass(firstFilteredCourse);
  };

  return { loading, searchQuery, filteredCourses, handleSearch, handleSearchKeyDown, addClass };
}

type CourseResultsProps = {
  courses: Course[];
  onAdd: (course: Course) => Promise<void>;
};

function CourseResults({ courses, onAdd }: CourseResultsProps) {
  return (
    <ul className="list-none pl-0 text-black dark:text-white">
      {courses.map((course) => (
        <li className="my-2 flex items-center" key={course.id}>
          <button
            onClick={() => {
              void onAdd(course);
            }}
            className="course-search-result"
          >
            <Plus className="h-4 w-4 shrink-0" />

            <span className="course-search-text" title={`${course.courseID} ${course.name}`}>
              {course.courseID} {course.name}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Courses(props: CoursesProps) {
  const search = useCourseSearch(props);

  if (search.loading) return <p className="text-default">Loading...</p>;

  return (
    <div className="course-picker">
      <label className="course-search-wrap">
        <Search size={18} />
        <input
          type="search"
          placeholder="Search courses..."
          value={search.searchQuery}
          onChange={search.handleSearch}
          onKeyDown={search.handleSearchKeyDown}
          className="course-search-input"
          id="searchBar"
        />
      </label>

      {search.filteredCourses.length > 0 ? (
        <CourseResults courses={search.filteredCourses} onAdd={search.addClass} />
      ) : (
        search.searchQuery && <p className="form-empty-copy">No courses found.</p>
      )}
    </div>
  );
}

export function ClassList() {
  const { user } = useUser();
  const userId = user?.emailAddresses[0]?.emailAddress;
  const { classes, setClasses, addCourse, deleteCourse } = useUserCourses(userId);

  return (
    <div className="class-list">
      <Courses userId={userId} classes={classes} setClasses={setClasses} addCourse={addCourse} />
      <ul className="class-list-items">
        {classes.map((cls) => (
          <li key={cls.courseID} className="class-list-item">
            <div className="class-list-text">
              <strong>{cls.courseID}</strong>
              <span>{cls.name}</span>
            </div>
            <button
              onClick={() => {
                void deleteCourse(cls.courseID);
              }}
              className="row-icon-button"
              aria-label={`Remove ${cls.courseID}`}
            >
              <Trash2 size={17} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
