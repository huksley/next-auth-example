module.exports = {
  target: "serverless",
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      require_optional: "require-optional-mongodb",
    };

    return config;
  },
};
