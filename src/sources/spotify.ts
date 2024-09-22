import axios from "axios";
import { AxiosRequestConfig } from "axios";
import qs from "qs";
import Source from "./source";
import { errorHandler } from "../utils/axios";
import { ContentType } from "types";

type Episodes = {
  items: any[];
};

class Spotify extends Source {
  token: string = "";

  async init() {
    this.token = await this.getAuthToken();
  }

  async createInitJobs(searchTerm: string) {
    if (!this.token) return;

    const { episodes } = await this.getPodcasts(searchTerm);
  }

  async createDailyJobs(searchTerm: string) {}

  async createJobs(episodes: Episodes) {
    episodes.items.map(async (item: any) => {
      const content: ContentType = {
        uuid: "",
        sourceUuid: item.id,
        source: "spotify",
        type: "podcast",
        title: item.name,
        description: item.description,
        channel: "",
        url: item.external_urls.spotify,
        previewUrl: item.audio_preview_url,
        fileUrl: item.href,
        thumbnailSmall: item.images[2].url,
        thumbnailLarge: item.images[0].url,
        likeCount: 0,
        viewCount: 0,
        commentCount: 0,
        tags: [],
        places: [],
        transcript: "",
        publishedAt: this.formatDate(item.release_date),
      };
      content.tags = this.getTags(content);
      this.addContentJob(content);
    });
  }

  async getAuthToken() {
    try {
      const auth_token = Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`,
        "utf-8"
      ).toString("base64");

      const { data } = await axios.post(
        "https://accounts.spotify.com/api/token",
        qs.stringify({ grant_type: "client_credentials" }),
        {
          headers: {
            Authorization: `Basic ${auth_token}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );
      return data.access_token;
    } catch (error) {
      return errorHandler(error, "");
    }
  }

  async getPodcasts(term: string) {
    try {
      const options: AxiosRequestConfig = {
        method: "GET",
        url: `https://api.spotify.com/v1/search`,
        params: { q: term, type: "episode", limit: 50, market: "us" },
        headers: {
          Authorization: "Bearer " + this.token,
        },
      };

      const { data } = await axios.request(options);
      return data;
    } catch (error) {
      return errorHandler(error, { episodes: { items: [] } });
    }
  }
}

export default Spotify;
