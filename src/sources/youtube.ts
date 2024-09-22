import axios from "axios";
import { AxiosRequestConfig } from "axios";
import { load } from "cheerio";
import { YoutubeTranscript } from "youtube-transcript";
import Source from "./source";
import { ContentType, Video } from "types";
import logger from "../utils/logger";

class Youtube extends Source {
  init() {}

  async createInitJobs(searchTerm: string) {
    const videos = await this.getPaginatedVideos(searchTerm);
    await this.createJobs(videos);
  }

  async createDailyJobs(searchTerm: string) {
    const data = await this.getVideos(searchTerm, {
      maxResults: 50,
      publishedAfter: "2023-05-02T00:00:00Z",
    });
    const videos = data?.items;
    if (videos) await this.createJobs(videos);
  }

  async createJobs(videos: Video[]) {
    const contentPromises = videos.map(async (video: Video) => {
      const content: ContentType = {
        uuid: "",
        sourceUuid: video.id.videoId,
        source: "youtube",
        type: "video",
        title: video.snippet.title,
        description: video.snippet.description,
        channel: video.snippet.channelTitle,
        url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
        thumbnailSmall: video.snippet.thumbnails.default.url,
        thumbnailLarge: video.snippet.thumbnails.high.url,
        previewUrl: "",
        fileUrl: "",
        likeCount: 0,
        viewCount: 0,
        commentCount: 0,
        tags: [],
        places: [],
        transcript: "",
        publishedAt: this.formatDate(video.snippet.publishedAt),
      };
      const updatedContent = await this.scrapeContent(content);
      if (updatedContent) {
        updatedContent.tags = this.getTags(updatedContent);
        this.addContentJob(updatedContent);
      }
    });
    await Promise.allSettled(contentPromises);
  }

  async getVideoTags(videoId: string, url: string) {
    try {
      const options: AxiosRequestConfig = {
        method: "GET",
        url,
        params: {
          id: videoId,
          part: "topicDetails",
          key: process.env.YOUTUBE_API_KEY,
        },
      };

      const { data } = await axios.request(options);
      const $ = load(data);
      const tags = $("meta[property='og:video:tag']")
        .toArray()
        .map((element) => $(element).attr("content")?.toLowerCase())
        .filter((element) => !!element) as string[];
      return tags;
    } catch (err) {
      logger.error(err, "Error getting youtube video tags");
      return [];
    }
  }

  async getVideoStatistics(videoId: string) {
    try {
      const options: AxiosRequestConfig = {
        method: "GET",
        url: `https://www.googleapis.com/youtube/v3/videos`,
        params: {
          id: videoId,
          part: "statistics",
          key: process.env.YOUTUBE_API_KEY,
        },
      };

      const { data } = await axios.request(options);
      return data.items[0].statistics;
    } catch (err) {
      logger.error(err, "Error getting youtube video statistics");
      return {};
    }
  }

  async getVideoTranscript(videoId: string): Promise<any[]> {
    try {
      const data = await YoutubeTranscript.fetchTranscript(videoId);
      return data;
    } catch (err) {
      logger.error(err, "Error getting youtube video transcript");
      return [];
    }
  }

  processVideoTranscript(transcript: any) {
    const text = transcript
      .map((item: any) => item.text)
      .join(" ")
      .replace(/\n/g, " ");
    return text;
  }

  async getPaginatedVideos(term: string, pages: number = 40) {
    let items: any[] = [];
    let pageToken = "";
    while (pages) {
      const data = await this.getVideos(term, { pageToken });
      if (data) {
        pageToken = data.nextPageToken;
        items = [...items, ...data.items];
      }
      pages--;
    }

    return items;
  }

  async getVideos(
    term: string,
    params: object = {}
  ): Promise<{ nextPageToken: string; items: any[] } | void> {
    try {
      const options: AxiosRequestConfig = {
        method: "GET",
        url: `https://www.googleapis.com/youtube/v3/search`,
        params: {
          q: term,
          type: "video",
          order: "viewCount",
          part: "snippet",
          videoEmbeddable: true,

          key: process.env.YOUTUBE_API_KEY,
          ...params,
        },
      };

      const { data } = await axios.request(options);
      return data;
    } catch (err) {
      logger.error(err, "Error getting youtube videos");
    }
  }

  async scrapeContent(content: ContentType) {
    const statistics = await this.getVideoStatistics(content.sourceUuid);
    const tags = await this.getVideoTags(content.sourceUuid, content.url);
    const originalTranscript = await this.getVideoTranscript(
      content.sourceUuid
    );
    const transcript = this.processVideoTranscript(originalTranscript);

    return {
      ...content,
      likeCount: parseInt(statistics.likeCount || "0", 10),
      viewCount: parseInt(statistics.viewCount || "0", 10),
      commentCount: parseInt(statistics.commentCount || "0", 10),
      tags,
      originalTranscript,
      transcript,
    };
  }
}

export default Youtube;
