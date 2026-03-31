import express from "express";
import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
// Import Express types correctly
import type { Request, Response } from "express";

// Enable debug logging to see what's happening
process.env.DEBUG = "mcp:*";

const app = express();
app.use(express.json());

const server = new McpServer({
  name: "Echo",
  version: "1.0.0",
});

// Register our capabilities
server.resource(
  "echo",
  new ResourceTemplate("echo://{message}", { list: undefined }),
  async (uri, { message }) => ({
    contents: [
      {
        uri: uri.href,
        text: `Resource echo: ${message}`,
      },
    ],
  }),
);

server.tool("echo", { message: z.string() }, async ({ message }) => ({
  content: [{ type: "text", text: `Tool echo: ${message}` }],
}));

server.prompt("echo", { message: z.string() }, ({ message }) => ({
  messages: [
    {
      role: "user",
      content: {
        type: "text",
        text: `Please process this message: ${message}`,
      },
    },
  ],
}));

app.post("/mcp", async (req: Request, res: Response) => {
  try {
    // Log incoming request for debugging
    console.log("Received request:", JSON.stringify(req.body, null, 2));

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on("close", () => {
      console.log("Request closed");
      transport.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }
  }
});

app.get("/mcp", async (req: Request, res: Response) => {
  console.log("Received GET MCP request");
  res.writeHead(405).end(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message:
          "Method not allowed. Use POST to interact with the MCP server. Follow README for details.",
      },
      id: null,
    }),
  );
});

app.delete("/mcp", async (req: Request, res: Response) => {
  console.log("Received DELETE MCP request");
  res.writeHead(405).end(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message:
          "Method not allowed. Use POST to interact with the MCP server. Follow README for details.",
      },
      id: null,
    }),
  );
});

// Start the server
const PORT = Number(process.env.PORT || process.env.MCP_SERVER_PORT || 3000);
app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `MCP Stateless Streamable HTTP Server listening on 0.0.0.0:${PORT}`,
  );
});

// Base URL for the NO-BS-FTP API
const API_URL = process.env.MCP_API_URL || "https://no-bs-ftp-production.up.railway.app/mcp";

// Helper function for making API requests
async function makeAPIRequest<T>(
  url: string,
  method: string,
  body?: any,
): Promise<T | null> {
  const headers = {
    "Content-Type": "application/json",
  };

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error("Error making API request:", error);
    return null;
  }
}

// Interfaces for request and response types
interface ConnectionProfile {
  host: string;
  port: number;
  username: string;
  password: string;
}

interface HealthStatus {
  status: string;
  message: string;
}

interface Stats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
}

// Register MCP tools

// @ts-ignore
server.tool(
  "invoke-mcp-method",
  "Invoke MCP JSON-RPC 2.0 methods for S3-compatible object storage operations",
  {
    method: z.string().describe("The method to invoke"),
    params: z.any().optional().describe("Parameters for the method"),
  },
  async ({ method, params }) => {
    const url = `${API_URL}/mcp`;
    const response = await makeAPIRequest<any>(url, "POST", { method, params });

    if (!response) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to invoke MCP method",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "json",
          json: response,
        },
      ],
    };
  },
);

// @ts-ignore
server.tool(
  "get-mcp-get-example",
  "Example GET endpoint for MCP to support browser requests",
  {},
  async () => {
    const url = `${API_URL}/mcp`;
    const response = await makeAPIRequest<any>(url, "GET");

    if (!response) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve MCP GET example",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "json",
          json: response,
        },
      ],
    };
  },
);

// @ts-ignore
server.tool(
  "get-connection-profile",
  "Retrieve the stored S3-compatible provider connection profile",
  {},
  async () => {
    const url = `${API_URL}/connection`;
    const response = await makeAPIRequest<ConnectionProfile>(url, "GET");

    if (!response) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve connection profile",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "json",
          json: response,
        },
      ],
    };
  },
);

// @ts-ignore
server.tool(
  "set-connection-profile",
  "Store or update the S3-compatible provider connection profile",
  {
    profile: z.object({
      host: z.string(),
      port: z.number(),
      username: z.string(),
      password: z.string(),
    }),
  },
  async ({ profile }) => {
    const url = `${API_URL}/connection`;
    const response = await makeAPIRequest<ConnectionProfile>(
      url,
      "POST",
      profile,
    );

    if (!response) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to set connection profile",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: "Connection profile updated successfully",
        },
      ],
    };
  },
);

// @ts-ignore
server.tool(
  "get-mcp-health-status",
  "Get health status of the MCP connection",
  {},
  async () => {
    const url = `${API_URL}/health/mcp`;
    const response = await makeAPIRequest<HealthStatus>(url, "GET");

    if (!response) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve MCP health status",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "json",
          json: response,
        },
      ],
    };
  },
);

// @ts-ignore
server.tool(
  "get-mcp-stats",
  "Get usage statistics of the MCP connection",
  {},
  async () => {
    const url = `${API_URL}/stats/mcp`;
    const response = await makeAPIRequest<Stats>(url, "GET");

    if (!response) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve MCP stats",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "json",
          json: response,
        },
      ],
    };
  },
);

// @ts-ignore
server.tool(
  "get-health-status",
  "Get health status of the API",
  {},
  async () => {
    const url = `${API_URL}/health`;
    const response = await makeAPIRequest<any>(url, "GET");

    if (!response) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve API health status",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "json",
          json: response,
        },
      ],
    };
  },
);

// @ts-ignore
server.tool("get-stats", "Get usage statistics of the API", {}, async () => {
  const url = `${API_URL}/stats`;
  const response = await makeAPIRequest<any>(url, "GET");

  if (!response) {
    return {
      content: [
        {
          type: "text",
          text: "Failed to retrieve API stats",
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "json",
        json: response,
      },
    ],
  };
});

// @ts-ignore
server.tool(
  "get-env-file",
  "Retrieve the .env configuration file for agent deployment",
  {},
  async () => {
    const url = `${API_URL}/.env`;
    const response = await makeAPIRequest<string>(url, "GET");

    if (!response) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve .env file",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: response,
        },
      ],
    };
  },
);

// @ts-ignore
server.tool(
  "openai-orchestration",
  "OpenAI-compatible endpoint for LLM orchestration",
  {
    input: z.string().describe("Input for OpenAI orchestration"),
  },
  async ({ input }) => {
    const url = `${API_URL}/llm/openai`;
    const response = await makeAPIRequest<any>(url, "POST", { input });

    if (!response) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to invoke OpenAI orchestration",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "json",
          json: response,
        },
      ],
    };
  },
);

// @ts-ignore
server.tool(
  "google-llm-orchestration",
  "Google-compatible endpoint for LLM orchestration",
  {
    input: z.string().describe("Input for Google LLM orchestration"),
  },
  async ({ input }) => {
    const url = `${API_URL}/llm/google`;
    const response = await makeAPIRequest<any>(url, "POST", { input });

    if (!response) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to invoke Google LLM orchestration",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "json",
          json: response,
        },
      ],
    };
  },
);

// @ts-ignore
server.tool(
  "list-skills",
  "List available skills for LLM integration",
  {},
  async () => {
    const url = `${API_URL}/skills`;
    const response = await makeAPIRequest<any>(url, "GET");

    if (!response) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve skills",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "json",
          json: response,
        },
      ],
    };
  },
);

// @ts-ignore
server.tool(
  "add-skill",
  "Add a new skill for LLM integration",
  {
    skill: z.object({
      name: z.string(),
      description: z.string(),
    }),
  },
  async ({ skill }) => {
    const url = `${API_URL}/skills`;
    const response = await makeAPIRequest<any>(url, "POST", skill);

    if (!response) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to add skill",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: "Skill added successfully",
        },
      ],
    };
  },
);
