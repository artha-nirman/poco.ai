import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

/**
 * GET /api/openapi.json
 * Serves the OpenAPI specification as JSON
 */
export async function GET(request: NextRequest) {
  try {
    const openApiPath = path.join(process.cwd(), 'docs', 'api', 'openapi-v2.yaml')
    
    if (!fs.existsSync(openApiPath)) {
      return NextResponse.json(
        { error: 'OpenAPI specification not found' },
        { status: 404 }
      )
    }

    // For now, let's create a basic OpenAPI JSON structure
    // In a real implementation, you'd parse the YAML file
    const openApiSpec = {
      openapi: "3.0.0",
      info: {
        title: "Poco.ai V2 API",
        description: "Intelligent Insurance Policy Analysis Platform API",
        version: "2.0.0",
        contact: {
          name: "Poco.ai API Support",
          email: "api-support@poco.ai",
          url: "https://poco.ai/support"
        },
        license: {
          name: "MIT",
          url: "https://opensource.org/licenses/MIT"
        }
      },
      servers: [
        {
          url: "http://localhost:3000/api/v2",
          description: "Development server"
        },
        {
          url: "https://poco.ai/api/v2", 
          description: "Production server"
        }
      ],
      paths: {
        "/{country}/policies/analyze": {
          post: {
            tags: ["Policy Analysis"],
            summary: "Analyze insurance policy",
            description: "Submit an insurance policy document for AI-powered analysis and recommendations",
            parameters: [
              {
                name: "country",
                in: "path",
                required: true,
                description: "Country code (au, sg, nz)",
                schema: {
                  type: "string",
                  enum: ["au", "sg", "nz"]
                }
              }
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      policy_text: {
                        type: "string",
                        description: "The insurance policy document text to analyze"
                      },
                      user_preferences: {
                        type: "object",
                        properties: {
                          max_premium: {
                            type: "number",
                            description: "Maximum acceptable premium"
                          },
                          preferred_providers: {
                            type: "array",
                            items: { type: "string" }
                          }
                        }
                      }
                    },
                    required: ["policy_text"]
                  }
                }
              }
            },
            responses: {
              200: {
                description: "Analysis initiated successfully",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        session_id: {
                          type: "string",
                          description: "Unique session identifier for tracking analysis progress"
                        },
                        status: {
                          type: "string",
                          enum: ["created", "processing"]
                        },
                        estimated_completion_time: {
                          type: "string",
                          description: "Estimated completion time in ISO format"
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "/{country}/policies/progress/{sessionId}": {
          get: {
            tags: ["Policy Analysis"],
            summary: "Get analysis progress",
            description: "Get real-time progress updates for policy analysis",
            parameters: [
              {
                name: "country",
                in: "path",
                required: true,
                schema: { type: "string", enum: ["au", "sg", "nz"] }
              },
              {
                name: "sessionId",
                in: "path", 
                required: true,
                schema: { type: "string" }
              }
            ],
            responses: {
              200: {
                description: "Progress information",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        session_id: { type: "string" },
                        stage: { type: "string" },
                        progress: { type: "number", minimum: 0, maximum: 100 },
                        message: { type: "string" },
                        estimated_completion: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "/{country}/policies/results/{sessionId}": {
          get: {
            tags: ["Policy Analysis"], 
            summary: "Get analysis results",
            description: "Retrieve completed policy analysis results and recommendations",
            parameters: [
              {
                name: "country",
                in: "path",
                required: true,
                schema: { type: "string", enum: ["au", "sg", "nz"] }
              },
              {
                name: "sessionId", 
                in: "path",
                required: true,
                schema: { type: "string" }
              }
            ],
            responses: {
              200: {
                description: "Analysis results and recommendations",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        session_id: { type: "string" },
                        analysis_results: { type: "object" },
                        recommendations: {
                          type: "array",
                          items: { type: "object" }
                        },
                        summary: { type: "object" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: "apiKey",
            in: "header",
            name: "X-API-Key"
          }
        }
      }
    }

    return NextResponse.json(openApiSpec, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })

  } catch (error) {
    console.error('Error serving OpenAPI spec:', error)
    return NextResponse.json(
      { error: 'Failed to load OpenAPI specification' },
      { status: 500 }
    )
  }
}