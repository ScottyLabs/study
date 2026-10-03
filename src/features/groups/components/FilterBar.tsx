import Select, { type MultiValue, type StylesConfig } from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { CalendarDays, Search } from "lucide-react";

type FilterOption = { value: string; label: string };

const customSelectComponents = {
  ClearIndicator: () => null,
};

const customSelectStyles: StylesConfig<FilterOption, true> = {
  input: (provided) => ({
    ...provided,
    color: "inherit",
  }),
  control: (provided, state) => ({
    ...provided,
    height: "44px",
    minHeight: "44px",
    backgroundColor: "var(--filter-input-background)",
    borderColor: state.isFocused ? "#B91C1C" : "var(--filter-border-color)",
    boxShadow: state.isFocused ? "0 0 0 2px rgb(28 28 28 / 0.00001)" : "none",
    borderRadius: "8px",
    padding: "0 4px",
    color: "inherit",
  }),
  multiValue: (provided, state) => ({
    ...provided,
    backgroundColor: state.isFocused ? "#F3F4F6" : "#F3F4F6",
    borderRadius: "6px",
    padding: "2px",
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: "#000",
  }),
  multiValueRemove: (provided, state) => ({
    ...provided,
    color: state.isFocused ? "#B91C1C" : "#6b7280",
    ":hover": {
      backgroundColor: "#FEE2E2",
      color: "#B91C1C",
    },
  }),
  placeholder: (provided) => ({
    ...provided, 
    color: "inherit",
    opacity: 0.4,
  }),
};

interface TopFilterBarProps {
  courseOptions: FilterOption[];
  selectedCourses: MultiValue<FilterOption>;
  setSelectedCourses: (selected: MultiValue<FilterOption>) => void;
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

function TopFilterBar({
  courseOptions,
  selectedCourses,
  setSelectedCourses,
  selectedDate,
  setSelectedDate,
  searchQuery,
  setSearchQuery,
}: TopFilterBarProps) {
  return (
    <div className="top-bar">
      <div className="filter-bar">
        <div className="filter-controls">
          <label className="filter-search">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by course, title, or topic"
              aria-label="Search groups"
            />
          </label>

          <Select
            isMulti
            options={courseOptions}
            value={selectedCourses}
            onChange={setSelectedCourses}
            classNamePrefix="react-select"
            className="filter-course-select"
            placeholder="All courses"
            styles={customSelectStyles}
            components={customSelectComponents}
          />

          <div className="filter-date-control">
            <CalendarDays className="filter-date-icon" size={17} />
            <DatePicker
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              customInput={<input />}
              popperClassName="custom-popper"
              wrapperClassName="filter-date-wrapper"
              placeholderText="Any date"
              className="filter-date-input"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default TopFilterBar;
