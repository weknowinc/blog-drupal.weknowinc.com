const webpack = require("webpack");

var entryPoints = {
  themekit: './js/src/theme.js'
};

var compiledEntries = {};

for (var prop in entryPoints) {
  compiledEntries[prop] = entryPoints[prop];
}

var config = {
  context: __dirname,
  entry: compiledEntries,

  output: {
    path: __dirname + '/dist/js',
    filename: "[name].js"
  },
  resolve: {
    extensions: ['.js', '.vue', '.json'],
    alias: {
      'vue$': 'vue/dist/vue.esm.js'
    }
  },
  externals: {
    jquery: 'jQuery'
  },

  devtool: 'cheap-source-map',
  plugins: [
    // The below will shim global jquery, the first two lines will replace $/jQuery when require('jquery') is called
    // The third line, which we probably will always need with Drupal, then uses the window.jQuery instead of the
    // module jquery when require('jquery') is called
    new webpack.ProvidePlugin({
      $: "jquery",
      jQuery: "jquery",
      "window.jQuery": "jquery"
    }),
    new webpack.optimize.CommonsChunkPlugin({
      name: "commons",
      filename: "commons.js",
    })
  ],
  module: {
    loaders: [
      {
        test: /\.vue$/,
        loader: 'vue'
      },
      {
        test: /\.js$/,
        // must add exceptions to this exlude statement for anything that needs to be transpiled by babel
        exclude: /node_modules\/(?!foundation-sites)/,
        loader: 'babel-loader',
        query: {
          presets: ["env"]
        }
      }
    ],
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      },
    ]
  }
};

module.exports = config;
