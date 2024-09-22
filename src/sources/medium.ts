import axios from "axios";
import fs from "fs";
import UserAgent from "user-agents";
import Source from "./source";
import { errorHandler } from "../utils/axios";
import { ContentType } from "./types";

class Medium extends Source {
  init() {}

  async createInitJobs(searchTerm: string) {
    const { articles } = await this.getArticles(searchTerm);
    const contentPromises = articles.map(async (article: string) => {
      const content: ContentType = {
        uuid: "",
        url: `https://medium.com/p/${article}`,
        sourceUuid: article,
        source: "medium",
        type: "article",
        title: "",
        description: "",
        channel: "",
        previewUrl: "",
        fileUrl: "",
        thumbnailSmall: "",
        thumbnailLarge: "",
        likeCount: 0,
        viewCount: 0,
        commentCount: 0,
        tags: [],
        places: [],
        transcript: "",
        publishedAt: new Date(),
      };
      const updatedContent = await this.scrapeContent(content);
    });
    await Promise.allSettled(contentPromises);
  }

  async createDailyJobs(searchTerm: string) {}

  async getArticles(query: string) {
    try {
      const options = {
        method: "GET" as "GET",
        url: "https://medium2.p.rapidapi.com/search/articles",
        params: { query },
        headers: {
          "X-RapidAPI-Key": process.env.RAPID_API_KEY as string,
          "X-RapidAPI-Host": "medium2.p.rapidapi.com",
        },
      };

      const { data } = await axios.request(options);
      return data;
    } catch (error) {
      return errorHandler(error, []);
    }
  }

  getArticleTranscript(paragraphs: []) {
    return paragraphs.reduce((transcript: string, paragraph: any) => {
      if (paragraph.type === "P") return [transcript, paragraph.text].join(" ");
      return transcript;
    }, "");
  }

  async scrapeContent(content: ContentType) {
    try {
      const userAgent = new UserAgent();
      const query = fs.readFileSync(
        __dirname + "/../utils/graphQueries/medium.txt",
        "utf8"
      );
      const { data } = await axios.post(
        "https://mshe8092.medium.com/_/graphql",
        [
          {
            operationName: "PostPageQuery",
            variables: {
              postId: content.sourceUuid,
              postMeteringOptions: {
                forceTruncation: false,
              },
              awardType: "STAFF_PICK",
              isSingleColumnLayout: false,
            },
            query,
          },
        ],
        {
          headers: {
            "User-Agent": userAgent.toString(),
            Accept: "*/*",
            "Accept-Language": "en-GB,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br",
            Referer:
              "https://mshe8092.medium.com/more-than-just-a-hydroelectric-power-plant-its-also-a-unique-place-to-relax-f522168069d1",
            "content-type": "application/json",
            "apollographql-client-name": "lite",
            "apollographql-client-version": "main-20230331-090946-8078adcdd4",
            "ot-tracer-spanid": "552760435c29c708",
            "ot-tracer-traceid": "4151150996684c3f",
            "ot-tracer-sampled": "true",
            "medium-frontend-app": "lite/main-20230331-090946-8078adcdd4",
            "medium-frontend-route": "post",
            "medium-frontend-path":
              "/more-than-just-a-hydroelectric-power-plant-its-also-a-unique-place-to-relax-f522168069d1",
            "graphql-operation": "PostPageQuery",
            Origin: "https://mshe8092.medium.com",
            DNT: "1",
            Connection: "keep-alive",
            Cookie:
              "uid=lo_3c8d5a1cda52; __cfruid=1a8d720f98c8475e369577a6f68659f466f4c675-1680259025; _dd_s=rum=0&expire=1680259926426; sid=1:K0GCGjKOHag9ikUNYxzMJW2y1ppOiV4elqn0/F0jpP4zw/LqtqAPLkGcmJN+YsqW",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            TE: "trailers",
          },
        }
      );

      const { postResult } = data[0].data;
      const transcript = this.getArticleTranscript(
        postResult.content.bodyModel.paragraphs
      );

      return {
        ...content,
        title: postResult.title,
        description: postResult.previewContent.subtitle,
        channelId: postResult.creator.id,
        channelTitle: postResult.creator.username,
        url: postResult.mediumUrl,
        thumbnailSmall: `https://miro.medium.com/v2/resize:fit:300/${postResult.previewImage.id}`,
        thumbnailLarge: `https://miro.medium.com/v2/resize:fit:800/${postResult.previewImage.id}`,
        likeCount: postResult.voterCount,
        commentCount: postResult.postResponses.count,
        tags: postResult.tags.map((tag: any) =>
          tag.id.toLowerCase().replaceAll("-", " ")
        ),
        originalTranscript: postResult.content.bodyModel,
        transcript,
        publishedAt: this.formatDate(postResult.firstPublishedAt),
      };
    } catch (error) {
      errorHandler(error, null);
    }
  }
}

export default Medium;
