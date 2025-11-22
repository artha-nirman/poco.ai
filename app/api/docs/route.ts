import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'

/**
 * GET /api/docs
 * Serves interactive Swagger UI for the V2 API documentation
 */
export async function GET(request: NextRequest) {
  try {
    // Load the OpenAPI specification
    const openApiPath = path.join(process.cwd(), 'docs', 'api', 'openapi-v2.yaml')
    
    if (!fs.existsSync(openApiPath)) {
      return NextResponse.json(
        { error: 'OpenAPI specification not found' },
        { status: 404 }
      )
    }

    const openApiContent = fs.readFileSync(openApiPath, 'utf8')
    const openApiSpec = yaml.load(openApiContent)

    // Create Swagger UI HTML page
    const swaggerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Poco.ai V2 API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin:0; background: #fafafa; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .info .title { color: #3b4151; font-size: 36px; font-weight: 600; }
    .custom-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      text-align: center;
      margin-bottom: 20px;
    }
    .custom-header h1 { margin: 0; font-size: 28px; font-weight: 600; }
    .custom-header p { margin: 10px 0 0 0; opacity: 0.9; }
  </style>
</head>
<body>
  <div class="custom-header">
    <h1>🚀 Poco.ai V2 API Documentation</h1>
    <p>Intelligent Insurance Policy Analysis Platform - Interactive API Reference</p>
  </div>
  
  <div id="swagger-ui"></div>
  
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const spec = ${JSON.stringify(openApiSpec, null, 2)};
      
      SwaggerUIBundle({
        url: undefined,
        spec: spec,
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
        docExpansion: "list",
        supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
        tryItOutEnabled: true,
        requestInterceptor: function(request) {
          // Add any custom headers or authentication here
          console.log('API Request:', request);
          return request;
        },
        responseInterceptor: function(response) {
          console.log('API Response:', response);
          return response;
        }
      });
    };
  </script>
</body>
</html>`;

    return new NextResponse(swaggerHtml, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Error serving Swagger docs:', error)
    return NextResponse.json(
      { 
        error: 'Failed to load API documentation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}