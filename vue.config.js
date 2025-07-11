const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    proxy: {
      '/api': {
        target: 'http://172.16.0.132:5000',
        changeOrigin: true,
        ws: true,
        // Fix for large file uploads
        proxyTimeout: 1800000, // 30 minutes
        // Disable SSL certificate validation if needed
        secure: false,
        // Additional logging for debugging
        //onProxyReq(proxyReq, req, res) {
        //  console.log('Proxying request:', req.method, req.url);
        //},
        //onProxyRes(proxyRes, req, res) {
        //  console.log('Proxy response:', proxyRes.statusCode, req.url);
        //},
        //onError(err, req, res) {
        //  console.error('Proxy error:', err);
        //}
      }
    },
    // Use valid client options
    client: {
      webSocketTransport: 'ws',
      overlay: {
        errors: true,
        warnings: false
      },
      progress: true
    },
    // Configure headers to handle large file uploads
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
    }
  },
  // Disable source maps in production for better performance
  productionSourceMap: process.env.NODE_ENV !== 'production'
})
