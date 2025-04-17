import * as sinon from "sinon";
import * as vscode from "vscode";
import type { GithubContent } from "../../api/types";
import "../../test/vscode-mock";
import { FileSystemService } from "../../utils/fileSystem";
import { ExplorerTreeItem } from "../../views/explorer/treeItem";

describe("FileSystemService - downloadCount", () => {
  let fsService: FileSystemService;
  let expect: Chai.ExpectStatic;

  function createMockExplorerTreeItem(
    content: GithubContent,
    children: ExplorerTreeItem[] = [],
  ): ExplorerTreeItem {
    const item = new ExplorerTreeItem(content);
    item.children = children;
    return item;
  }

  before(async () => {
    const chai = await import("chai");
    expect = chai.expect;
  });

  beforeEach(() => {
    fsService = FileSystemService.getInstance();
    sinon.stub(fsService as any, "getWorkspaceFolder").returns("/tmp");
    sinon.stub(fsService as any, "log");
    sinon.stub(vscode.window, "withProgress").callsFake(async (_opts, cb) =>
      cb(
        { report: () => {} },
        {
          isCancellationRequested: false,
          onCancellationRequested: () => ({
            dispose: () => {},
          }),
        },
      ),
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should count all files including in subfolders", async () => {
    const tree: ExplorerTreeItem[] = [
      createMockExplorerTreeItem({
        type: "file",
        path: "a.txt",
        name: "a.txt",
        sha: "sha-a",
        size: 1,
        url: "",
        html_url: "",
        git_url: "",
        download_url: "fake",
      }),
      createMockExplorerTreeItem(
        {
          type: "dir",
          path: "folder",
          name: "folder",
          sha: "sha-folder",
          size: 0,
          url: "",
          html_url: "",
          git_url: "",
          download_url: null,
        },
        [
          createMockExplorerTreeItem({
            type: "file",
            path: "folder/b.txt",
            name: "b.txt",
            sha: "sha-b",
            size: 1,
            url: "",
            html_url: "",
            git_url: "",
            download_url: "fake",
          }),
          createMockExplorerTreeItem({
            type: "file",
            path: "folder/c.txt",
            name: "c.txt",
            sha: "sha-c",
            size: 1,
            url: "",
            html_url: "",
            git_url: "",
            download_url: "fake",
          }),
          createMockExplorerTreeItem(
            {
              type: "dir",
              path: "folder/sub",
              name: "sub",
              sha: "sha-sub",
              size: 0,
              url: "",
              html_url: "",
              git_url: "",
              download_url: null,
            },
            [
              createMockExplorerTreeItem({
                type: "file",
                path: "folder/sub/d.txt",
                name: "d.txt",
                sha: "sha-d",
                size: 1,
                url: "",
                html_url: "",
                git_url: "",
                download_url: "fake",
              }),
            ],
          ),
        ],
      ),
    ];
    const count = fsService.countFiles(tree);
    expect(count).to.equal(4);
  });
});
