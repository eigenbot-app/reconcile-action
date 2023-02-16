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
  const secret = core.getInput("secret");
  if (secret === "") {
    return Error("input `secret` was not provided");
  }

  const token = core.getInput("token");

  return null;
}
