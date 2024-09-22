export type SourceType = "medium" | "spotify" | "youtube";

export type ContentType = {
  uuid: string;
  source: SourceType;
  sourceUuid: string;
  type: "article" | "podcast" | "video";
  title: string;
  description: string;
  channel?: string; // channel node has -> content
  url: string; // should be unique
  previewUrl?: string;
  fileUrl?: string;
  thumbnailSmall?: string;
  thumbnailLarge?: string;
  likeCount?: number;
  viewCount?: number;
  commentCount?: number;
  tags: string[]; // tagged -> tag node
  places: string[]; // references -> person node
  originalTranscript?: any;
  transcript: string;
  summary?: string;
  publishedAt: Date;
};
