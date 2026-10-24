import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import CreateGroupModal from "./CreateGroupModal";
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  dispatch: vi.fn(),
  capture: vi.fn(),
}));
vi.mock("react-redux", () => ({ useDispatch: () => mocks.dispatch }));
vi.mock("~/lib/hooks", () => ({ useAppSelector: () => true }));
vi.mock("~/lib/auth-client", () => ({
  useUser: () => ({
    user: {
      fullName: "Student",
      emailAddresses: [{ emailAddress: "student@cmu.edu" }],
    },
  }),
}));
vi.mock("posthog-js/react", () => ({
  usePostHog: () => ({ capture: mocks.capture }),
}));
vi.mock("~/helpers/calendar_helper", () => ({
  setupGoogleApi: async () => undefined,
  requestCalendarAccessInteractive: async () => undefined,
  addToCal: async () => "event",
  deleteFromCal: vi.fn(),
}));
vi.mock("~/features/profile/hooks/useUserCourses", () => ({
  useUserCourses: () => ({ classes: [] }),
}));
vi.mock("../services/groupApi", () => ({ createGroup: mocks.create }));
vi.mock("./GroupModalFields", () => ({
  GroupModalFields: ({ setDate }: { setDate: (date: Date) => void }) => (
    <button type="button" onClick={() => setDate(new Date("2099-01-01"))}>
      Set date
    </button>
  ),
}));
beforeEach(() => {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue("iPhone");
  mocks.create.mockResolvedValue({
    id: "created-id",
    course: "15-213",
    purpose: "Exam",
    title: "Session",
    startTime: new Date("2099-01-01"),
    totalSeats: 4,
    participantDetails: [],
  });
});
test("creation offers optional invitations and preserves created group data", async () => {
  const user = userEvent.setup();
  const { container } = render(<CreateGroupModal />);
  await user.click(screen.getByRole("button", { name: "Set date" }));
  fireEvent.submit(container.querySelector("form")!);
  expect(
    await screen.findByRole("heading", { name: "Group created!" }),
  ).toBeVisible();
  expect(mocks.dispatch).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Invite classmates" }));
  expect(screen.getByLabelText("Message")).toHaveValue(
    `Anyone want to study for the 15-213 exam? Join here: ${window.location.origin}/groups/created-id`,
  );
  await user.clear(screen.getByLabelText("Message"));
  await user.keyboard("{Escape}");
  expect(
    screen.getByRole("button", { name: "Invite classmates" }),
  ).toHaveFocus();
  await user.click(screen.getByRole("button", { name: "Invite classmates" }));
  expect(screen.getByLabelText("Message")).not.toHaveValue("");
  await user.keyboard("{Escape}");
  await user.click(screen.getByRole("button", { name: "Done" }));
  expect(mocks.dispatch).toHaveBeenCalledWith(
    expect.objectContaining({ payload: false }),
  );
  expect(mocks.create).toHaveBeenCalledOnce();
});
test("success step can be dismissed", async () => {
  const user = userEvent.setup();
  const { container } = render(<CreateGroupModal />);
  await user.click(screen.getByRole("button", { name: "Set date" }));
  fireEvent.submit(container.querySelector("form")!);
  await screen.findByRole("heading", { name: "Group created!" });
  await user.keyboard("{Escape}");
  expect(mocks.dispatch).toHaveBeenCalledWith(
    expect.objectContaining({ payload: false }),
  );
});

test("desktop creation offers copying the link without an invitation editor", async () => {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Macintosh");
  const user = userEvent.setup();
  const writeText = vi
    .spyOn(navigator.clipboard, "writeText")
    .mockResolvedValue();
  const { container } = render(<CreateGroupModal />);
  await user.click(screen.getByRole("button", { name: "Set date" }));
  fireEvent.submit(container.querySelector("form")!);
  await user.click(
    await screen.findByRole("button", { name: "Copy link to study group" }),
  );
  expect(writeText).toHaveBeenCalledWith(
    `${window.location.origin}/groups/created-id`,
  );
  expect(screen.queryByLabelText("Message")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Invite classmates" }),
  ).not.toBeInTheDocument();
});
