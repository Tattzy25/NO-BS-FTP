import express from "express";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
// Enable debug logging to see what's happening
process.env.DEBUG = "mcp:*";
const app = express();
app.use(express.json());
const server = new McpServer({
    name: "Echo",
    version: "1.0.0"
});
// Register our capabilities
server.resource("echo", new ResourceTemplate("echo://{message}", { list: undefined }), async (uri, { message }) => ({
    contents: [{
            uri: uri.href,
            text: `Resource echo: ${message}`
        }]
}));
server.tool("echo", { message: z.string() }, async ({ message }) => ({
    content: [{ type: "text", text: `Tool echo: ${message}` }]
}));
server.prompt("echo", { message: z.string() }, ({ message }) => ({
    messages: [{
            role: "user",
            content: {
                type: "text",
                text: `Please process this message: ${message}`
            }
        }]
}));
app.post('/mcp', async (req, res) => {
    try {
        // Log incoming request for debugging
        console.log('Received request:', JSON.stringify(req.body, null, 2));
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
        });
        res.on('close', () => {
            console.log('Request closed');
            transport.close();
        });
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
    }
    catch (error) {
        console.error('Error handling MCP request:', error);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: '2.0',
                error: {
                    code: -32603,
                    message: 'Internal server error',
                },
                id: null,
            });
        }
    }
});
app.get('/mcp', async (req, res) => {
    console.log('Received GET MCP request');
    res.writeHead(405).end(JSON.stringify({
        jsonrpc: "2.0",
        error: {
            code: -32000,
            message: "Method not allowed. Use POST to interact with the MCP server. Follow README for details."
        },
        id: null
    }));
});
app.delete('/mcp', async (req, res) => {
    console.log('Received DELETE MCP request');
    res.writeHead(405).end(JSON.stringify({
        jsonrpc: "2.0",
        error: {
            code: -32000,
            message: "Method not allowed. Use POST to interact with the MCP server. Follow README for details."
        },
        id: null
    }));
});
// Start the server
const PORT = process.env.MCP_SERVER_PORT || 3005;
app.listen(PORT, () => {
    console.log(`MCP Stateless Streamable HTTP Server listening on port ${PORT}`);
});
// Base URL for the NO-BS-FTP API
const API_URL = process.env.MCP_API_URL || "http://no-bs-ftp-production.up.railway.app/mcp";
// Helper function for making API requests
async function makeAPIRequest(url, method, body) {
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
        return (await response.json());
    }
    catch (error) {
        console.error("Error making API request:", error);
        return null;
    }
}
// Register MCP tools
// @ts-ignore
server.tool("get-mcp-health-status", "Get health status of the MCP connection", {}, async () => {
    const healthUrl = `${API_URL}/health/mcp`;
    const healthData = await makeAPIRequest(healthUrl, "GET");
    if (!healthData) {
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
                type: "text",
                text: `MCP Health Status: ${healthData.status}`,
            },
        ],
    };
});
// @ts-ignore
server.tool("get-mcp-stats", "Get usage statistics of the MCP connection", {}, async () => {
    const statsUrl = `${API_URL}/stats/mcp`;
    const statsData = await makeAPIRequest(statsUrl, "GET");
    if (!statsData) {
        return {
            content: [
                {
                    type: "text",
                    text: "Failed to retrieve MCP statistics",
                },
            ],
        };
    }
    return {
        content: [
            {
                type: "text",
                text: `MCP Usage: ${statsData.usage}, Connections: ${statsData.connections}`,
            },
        ],
    };
});
// @ts-ignore
server.tool("get-api-health-status", "Get health status of the API", {}, async () => {
    const healthUrl = `${API_URL}/health`;
    const healthData = await makeAPIRequest(healthUrl, "GET");
    if (!healthData) {
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
                type: "text",
                text: `API Health Status: ${healthData.status}`,
            },
        ],
    };
});
// @ts-ignore
server.tool("get-api-stats", "Get usage statistics of the API", {}, async () => {
    const statsUrl = `${API_URL}/stats`;
    const statsData = await makeAPIRequest(statsUrl, "GET");
    if (!statsData) {
        return {
            content: [
                {
                    type: "text",
                    text: "Failed to retrieve API statistics",
                },
            ],
        };
    }
    return {
        content: [
            {
                type: "text",
                text: `API Usage: ${statsData.usage}, Connections: ${statsData.connections}`,
            },
        ],
    };
});
// @ts-ignore
server.tool("get-env-file", "Retrieve the .env configuration file for agent deployment", {}, async () => {
    const envUrl = `${API_URL}/.env`;
    const envData = await makeAPIRequest(envUrl, "GET");
    if (!envData) {
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
                text: `Env File Content:\n${envData.content}`,
            },
        ],
    };
});
// Additional tools for LLM orchestration and skills can be added similarly
