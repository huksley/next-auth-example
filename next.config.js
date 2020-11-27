const path = require("path");

module.exports = {
  target: "serverless",

  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      require_optional: path.resolve(__dirname, "require-not-optional"),
    };

    return config;
  },
};
