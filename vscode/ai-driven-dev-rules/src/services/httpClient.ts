import type * as http from "node:http";
import * as https from "node:https";
import { URL } from "node:url";
import type { ILogger } from "./logger";

export interface HttpResponse {
  statusCode?: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}

export interface IHttpClient {
  get(url: string, headers?: Record<string, string>): Promise<HttpResponse>;
}

export class HttpClient implements IHttpClient {
  constructor(private readonly logger: ILogger) {}

  public get(
    url: string,
    headers: Record<string, string> = {},
  ): Promise<HttpResponse> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const options: https.RequestOptions = {
        headers: {
          ...headers,
        },
        timeout: 30000,
      };

      this.logger.debug(`HttpClient GET: ${url}`);

      const request = https.get(
        parsedUrl,
        options,
        (res: http.IncomingMessage) => {
          let data = "";

          res.setEncoding("utf8");

          res.on("data", (chunk) => {
            data += chunk;
          });

          res.on("end", () => {
            this.logger.debug(
              `HttpClient Response: ${res.statusCode} from ${url}`,
            );
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: data,
            });
          });
        },
      );

      request.on("error", (error) => {
        this.logger.error(
          `HttpClient Error for ${url}: ${error.message}`,
          error,
        );
        reject(error);
      });

      request.on("timeout", () => {
        request.destroy();
        this.logger.error(`HttpClient Timeout for ${url}`);
        reject(new Error(`Request timed out after ${options.timeout}ms`));
      });
    });
  }
}
