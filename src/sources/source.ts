import { ContentType } from "./types";

export const getContentString = (content: ContentType) => {
  const { title, description, transcript } = content;
  return [title, description, transcript].join(". ");
};

abstract class Source {
  abstract init(): void;
  abstract createInitJobs(searchTerm: string): void;
  abstract createDailyJobs(searchTerm: string): void;

  formatDate(date: string): Date {
    return new Date(date);
  }
}

export default Source;
