import sa = require('superagent')
import path = require('path')
import fs = require('fs')

var yaml = require('js-yaml');
const cwd = process.cwd()
const glob = require('glob')

const gh = "https://api.github.com/repos/{repo}/contents/{file}"

const syncFiles: string[] = glob.sync("**/.git-sync", { cwd: cwd });

const operations = [];

console.log("Found config files: \n\t", syncFiles.join("\n\t"))

syncFiles.forEach(file => {
  var baseDir = path.dirname(file)
  var ast = yaml.safeLoad(fs.readFileSync(file, 'utf8'))

  ast.auth = ast.auth || {
    user: process.env.GIT_SYNC_USER,
    token: process.env.GIT_SYNC_TOKEN
  }

  ast.repository = ast.repository || process.env.GIT_SYNC_REPO
  ast.pattern = ast.pattern || process.env.GIT_SYNC_PATTERN

  const syncSubset: string[] = glob.sync(baseDir + '/' + (ast.pattern || "*"), { cwd: baseDir, nodir: true });

  syncSubset.forEach(file => operations.push(uploadFile(file, baseDir, ast)));

  console.log("\tFiles:\n\t\t", syncSubset.join("\n\t\t"))
});

async function startOperations(operations) {
  for (var i in operations) {
    await operations[i]();
  }
}

startOperations(operations)
  .catch(err => {
    console.error(err.body);
    process.exit(1);
  });



function uploadFile(localFile, folder, ast) {
  //localFile = path.relative(localFile, folder)
  localFile = path.normalize(localFile)

  var url = gh.replace('{repo}', ast.repository)

  url = url.replace('{file}', localFile)

  return async function () {
    console.info(`Uploading ${localFile}`);

    let getResult: sa.Response = null;

    try {
      getResult = await superagentToPromise(
        sa
          .get(url)
          .auth(ast.auth.user, ast.auth.token)
      );
    } catch (e) {
      getResult = e;
    }

    const base64File = new Buffer(fs.readFileSync(path.resolve(folder, localFile))).toString('base64');

    let result: sa.Response = null;
    if (getResult.status == 200) {
      result = await superagentToPromise(
        sa
          .put(url)
          .auth(ast.auth.user, ast.auth.token)
          .send({
            message: ast.message || 'Updated from git-sync script',
            content: base64File,
            branch: ast.branch || undefined,
            sha: getResult.body.sha
          })
      );
    } else if (getResult.status == 404) {
      result = await superagentToPromise(
        sa
          .put(url)
          .auth(ast.auth.user, ast.auth.token)
          .send({
            message: ast.message || 'Updated from git-sync script',
            content: base64File,
            branch: ast.branch || undefined
          })
      );
    } else {
      throw new Error("Unknown error Response:" + getResult.status || getResult.toString())
    }

    console.log("\tCommit: #" + result.body.commit.sha);
  }
}

function superagentToPromise(sa: sa.SuperAgentRequest) {
  let fulfill = null;
  let raise = null;

  const promise = new Promise<sa.Response>((ok, err) => {
    fulfill = ok;
    raise = err;
  });

  sa.set('User-Agent', 'git-pusher/0.0.1');

  sa.end(function (err, res) {
    if (err)
      raise(err);
    else
      fulfill(res);
  });

  return promise;
}