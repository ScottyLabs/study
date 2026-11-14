export type StudyGroupParticipant = {
  name: string;
  url: string | null;
  email: string;
  eventId?: string;
  event?: string;
};

export type DateFilterRange = readonly [Date | null, Date | null];

export interface StudyGroup {
  title: string;
  id: string;
  totalSeats: number;
  location: string;
  purpose: string;
  startTime: Date;
  course: string;
  participantDetails: StudyGroupParticipant[];
  details: string;
}
