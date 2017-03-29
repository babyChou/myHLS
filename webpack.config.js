module.exports = {
  entry: './script/main.ts',
  output: {
    filename: './bundle.js'
  },
  devtool: 'inline-source-map',
  resolve: {
    extensions: ['.js', '.ts']
  },
  module: {
    loaders: [
      { test: /.ts$/, loader: 'awesome-typescript-loader' }
    ]
  }
};