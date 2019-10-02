const config = {
    entry: ['./js/index.js'],
    output: {
      path: __dirname + '/build',
      filename: 'pipelineVis.js',
      library: 'pipelineVis'
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude:  /node_modules/,
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/react']
          }
        },
        {
          test: /\.css$/,
          use: [
              'style-loader',
              'css-loader'
              ]
      },
      {
          test: /\.(png|svg|jpg|gif)$/,
          use: [
              'file-loader'
              ]
      }
      ]
    },
    resolve: {
      extensions: ['.js']
    },
    devServer:{
      writeToDisk:true,
    },
    mode: 'development'
}
module.exports = config;
