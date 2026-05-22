/** @type {import('semantic-release').GlobalConfig} */
export default {
  extends: "semantic-release-config-kuzzle",
  branches: [
    "master",
    { name: "1-dev", prerelease: "dev" },
    { name: "2-dev", prerelease: "2-dev" },
  ],
};
