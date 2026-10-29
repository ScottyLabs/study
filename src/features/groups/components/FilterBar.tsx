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
    color: "var(--filter-text-color)",
  }),
  control: (provided, state) => ({
    ...provided,
    height: "44px",
    minHeight: "44px",
    backgroundColor: "var(--filter-input-background)",
    borderColor: state.isFocused
      ? "var(--filter-selected-color)"
      : "var(--filter-border-color)",
    boxShadow: "none",
    borderRadius: "8px",
    padding: "0 4px",
    color: "var(--filter-text-color)",
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: "var(--filter-chip-background)",
    borderRadius: "6px",
    padding: "2px",
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: "var(--filter-chip-text)",
  }),
  multiValueRemove: (provided, state) => ({
    ...provided,
    color: state.isFocused
      ? "var(--filter-option-selected-text)"
      : "var(--filter-chip-text)",
    ":hover": {
      backgroundColor: "var(--filter-option-selected-background)",
      color: "var(--filter-option-selected-text)",
    },
  }),
  placeholder: (provided) => ({
    ...provided,
    color: "var(--filter-placeholder-color)",
    opacity: 0.4,
  }),
  singleValue: (provided) => ({
    ...provided,
    color: "var(--filter-text-color)",
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    color: "var(--filter-border-color)",
  }),
  indicatorSeparator: (provided) => ({
    ...provided,
    backgroundColor: "var(--filter-border-color)",
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: "var(--filter-menu-background)",
    border: "1px solid var(--filter-border-color)",
    boxShadow: "var(--filter-menu-shadow)",
    color: "var(--filter-text-color)",
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? "var(--filter-option-selected-background)"
      : state.isFocused
        ? "var(--filter-option-hover-background)"
        : "transparent",
    color: state.isSelected
      ? "var(--filter-option-selected-text)"
      : "var(--filter-text-color)",
    ":active": {
      backgroundColor: "var(--filter-option-selected-background)",
    },
  }),
  noOptionsMessage: (provided) => ({
    ...provided,
    color: "var(--filter-placeholder-color)",
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
