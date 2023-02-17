import * as cache from "@actions/tool-cache";
import * as core from "@actions/core";
import * as io from "@actions/io";
import * as os from "os";
import * as path from "path";
import cp from "child_process";
import { HttpsProxyAgent } from "https-proxy-agent";
import { Octokit } from "@octokit/core";
import { chmodSync } from "fs";

void run();

async function run(): Promise<void> {
  runAction()
    .then((res) => {
      if (res instanceof Error) {
        core.setFailed(res.message);
      }
    })
    .catch((err) => {
      core.setFailed(`internal error: ${err.message}`);
    });
}

async function runAction(): Promise<null | Error> {
  // if (core.getInput("access-key") === "") {
  //   return Error("Required input `access-key` was not provided");
  // }
  // if (core.getInput("dir") === "") {
  //   return Error("Required input `dir` was not provided");
  // }
  // if (core.getInput("github-token") === "") {
  //   return Error("Required input `github-token` was not provided");
  // }

  // const key = core.getInput("access-key");
  const token = core.getInput("github-token");
  // const repo = core.getInput("repo");
  // const ref = core.getInput("ref");
  // const sha = core.getInput("sha");

  const installDir = await download("eigenbot-app", "reconcile-action", token);
  if (installDir instanceof Error) {
    return installDir;
  }

  const assetName = getAssetName();
  if (assetName instanceof Error) {
    return assetName;
  }

  await chmodSync(path.join(installDir, assetName), 0o755);

  core.addPath(installDir);
  const binaryPath = await io.which(assetName, true);
  if (binaryPath === "") {
    return Error("Missing action executable on PATH.");
  }

  core.info(`Successfully setup.`);
  core.info(cp.execSync(`${binaryPath} -help`).toString());

  return null;
}

export async function download(
  owner: string,
  repo: string,
  token: string
): Promise<string | Error> {
  const assetName = getAssetName();
  if (assetName instanceof Error) {
    return assetName;
  }

  const binPath = cache.find(assetName, os.arch());
  if (binPath !== "") {
    core.info(`${binPath}: found cached action binary`);
    return binPath;
  }

  const url = await getDownloadURL(owner, repo, token);
  if (url instanceof Error) {
    return url;
  }

  core.info(`Downloading latest version from ${url}.`);

  const downloadPath = await cache.downloadTool(url);
  core.info(`Successfully downloaded from ${url} to ${downloadPath}.`);

  core.info("Caching executable.");
  const cached = await cache.cacheFile(
    downloadPath,
    assetName,
    "latest",
    os.arch()
  );
  core.info(`Successfully cached as ${cached}.`);
  return cached;
}

function getAssetName(): string | Error {
  let goarch = "";
  switch (os.arch()) {
    case "x64":
      goarch = "amd64";
      break;
    case "arm64":
      goarch = "arm64";
      break;
    default:
      return Error(`${os.arch()}: unsupported architecture`);
  }
  let goos = "";
  switch (os.platform()) {
    case "linux":
      goos = "linux";
      break;
    default:
      return Error(`${os.platform()}: unsupported platform`);
  }
  return `eigenbot-reconcile-${goos}-${goarch}`;
}

async function getDownloadURL(
  owner: string,
  repo: string,
  token: string
): Promise<string | Error> {
  const assetName = getAssetName();
  if (assetName instanceof Error) {
    return assetName;
  }

  const requestAgent = process.env.http_proxy
    ? new HttpsProxyAgent(process.env.http_proxy)
    : undefined;

  const octokit = new Octokit({
    auth: token,
    request: {
      agent: requestAgent,
    },
  });

  const { data: releases } = await octokit.request(
    "GET /repos/{owner}/{repo}/releases",
    {
      owner: owner,
      repo: repo,
      per_page: 1,
    }
  );

  for (const asset of releases[0].assets) {
    if (assetName === asset.name) {
      return asset.browser_download_url;
    }
  }

  return Error(`unable to find tool binary`);
}
