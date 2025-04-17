import * as fs from "node:fs";
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
  downloadFile(
    url: string,
    targetPath: string,
    headers?: Record<string, string>,
  ): Promise<void>;
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

  public downloadFile(
    url: string,
    targetPath: string,
    headers: Record<string, string> = {},
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const options: https.RequestOptions = {
        headers: {
          ...headers,
          "User-Agent": "VS-Code-AIDD-Extension",
        },
        timeout: 60000,
      };

      this.logger.debug(`HttpClient DownloadFile: ${url} to ${targetPath}`);

      const request = https.get(
        parsedUrl,
        options,
        (response: http.IncomingMessage) => {
          if (response.statusCode === 200) {
            const fileStream = fs.createWriteStream(targetPath);
            response.pipe(fileStream);

            fileStream.on("finish", () => {
              fileStream.close();
              this.logger.debug(
                `Successfully downloaded file to ${targetPath}`,
              );
              resolve();
              /* 
               fileStream.close((err) => { 
                 if (err) {
                   this.logger.error(
                     `Error closing file stream for ${targetPath}`,
                     err,
                   );
                   reject(err);
                 } else {
                   this.logger.debug(
                     `Successfully downloaded file to ${targetPath}`,
                   );
                   resolve();
                 }
               });
               */
            });

            fileStream.on("error", (err) => {
              this.logger.error(
                `File stream error for ${targetPath}`,
                err.message,
              );

              fs.unlink(targetPath, (unlinkErr) => {
                if (unlinkErr) {
                  this.logger.error(
                    `Failed to delete incomplete file ${targetPath}`,
                    unlinkErr,
                  );
                }
                reject(err);
              });
            });
          } else if (
            response.statusCode === 302 ||
            response.statusCode === 301
          ) {
            const redirectUrl = response.headers.location;
            if (redirectUrl) {
              this.logger.debug(
                `Redirecting download from ${url} to ${redirectUrl}`,
              );

              this.downloadFile(redirectUrl, targetPath)
                .then(resolve)
                .catch(reject);
            } else {
              const errorMsg = `Redirect (${response.statusCode}) without location header from ${url}`;
              this.logger.error(errorMsg);
              reject(new Error(errorMsg));
            }
          } else {
            const errorMsg = `Failed to download file from ${url}: Status Code ${response.statusCode}`;
            this.logger.error(errorMsg);

            response.resume();
            reject(new Error(errorMsg));
          }
        },
      );

      request.on("error", (error) => {
        this.logger.error(
          `HttpClient DownloadFile Error for ${url}: ${error.message}`,
          error,
        );
        reject(error);
      });

      request.on("timeout", () => {
        request.destroy();
        const errorMsg = `DownloadFile request timed out after ${options.timeout}ms for ${url}`;
        this.logger.error(errorMsg);
        reject(new Error(errorMsg));
      });
    });
  }
}
