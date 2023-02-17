import * as core from "@actions/core";

void run();

async function run(): Promise<void> {
  runReconcile()
    .then((res) => {
      if (res instanceof Error) {
        core.setFailed(res.message);
      }
    })
    .catch((err) => {
      core.setFailed(`internal error: ${err.message}`);
    });
}

async function runReconcile(): Promise<null | Error> {
  const secret = core.getInput("access-key");
  if (secret === "") {
    return Error("input `access-key` was not provided");
  }

  const token = core.getInput("github-token");

  return null;
}
