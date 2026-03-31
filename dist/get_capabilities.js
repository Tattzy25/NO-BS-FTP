var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
// Script to get MCP server capabilities
import fetch from 'node-fetch';
async function getCapabilities() {
    var _a, e_1, _b, _c;
    try {
        const response = await fetch('http://localhost:4000/mcp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json, text/event-stream',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'mcp.list_capabilities',
                params: {},
                id: '1',
            }),
        });
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/event-stream')) {
            // Handle server-sent events
            if (response.body) {
                try {
                    for (var _d = true, _e = __asyncValues(response.body), _f; _f = await _e.next(), _a = _f.done, !_a; _d = true) {
                        _c = _f.value;
                        _d = false;
                        const chunk = _c;
                        const text = new TextDecoder().decode(chunk);
                        const lines = text.split('\n');
                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const data = JSON.parse(line.substring(6));
                                console.log(JSON.stringify(data, null, 2));
                            }
                        }
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (!_d && !_a && (_b = _e.return)) await _b.call(_e);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
        }
        else {
            // Handle regular JSON response
            const result = await response.json();
            console.log(JSON.stringify(result, null, 2));
        }
    }
    catch (error) {
        console.error('Error:', error);
    }
}
getCapabilities();
