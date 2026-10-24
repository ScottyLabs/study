import type { StudyGroup } from "~/types";

export function groupLink(origin: string, id: string) {
  return `${origin}/groups/${encodeURIComponent(id)}`;
}

export function invitationMessage(
  group: Pick<StudyGroup, "course" | "purpose">,
  link: string,
) {
  return /exam/i.test(group.purpose)
    ? `Anyone want to study for the ${group.course} exam? Join here: ${link}`
    : `I'm looking for people to study ${group.course} with! Join my study group: ${link}`;
}

export function invitationEmail(course: string, message: string) {
  return `mailto:?subject=${encodeURIComponent(`Study ${course} with me`)}&body=${encodeURIComponent(message)}`;
}

export function nativeInvitation(
  course: string,
  message: string,
  link: string,
): ShareData {
  const title = `Study ${course} with me`;
  // Native targets receive a URL item instead of having to discover it in text.
  // Respect an edited invitation that no longer includes the group link.
  if (!message.includes(link)) return { title, text: message };
  return { title, text: message.replace(link, "").trim(), url: link };
}
