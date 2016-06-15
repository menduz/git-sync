# git-sync tool

This tool allows you to upload your local files to a github repository

## Install

`npm i --save github:menduz/git-sync`

## Usage

Create a `.git-sync` file on any folder with this structure

```yaml
auth:
    # github user name
    user: "menduz"
    # github personal token
    token: "githubUserToken"

# github repo
repository: "menduz/git-sync"

# glob, files to upload, optional
pattern: "**/*"

# name of the target branch, optional
branch: master
```

And then execute this command line on the folder

`$ git-sync`

Done.

## CI Process

You may use this on your CI process to upload results or generated files, if you dont want to store your token on travis you can use secured ENV vars:

 - `GIT_SYNC_USER` Github user name
 - `GIT_SYNC_TOKEN` Github personal token
 - `GIT_SYNC_REPO` Github repo
 - `GIT_SYNC_PATTERN` File pattern, glob
 - `GIT_SYNC_BRANCH` Target branch