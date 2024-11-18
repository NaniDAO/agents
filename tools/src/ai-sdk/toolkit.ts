import NaniAPI from "../api";
import tools from "../tools";
import { isToolAllowed, type Configuration } from "../configuration";
import type { CoreTool } from "ai";
import NaniTool from "./tool";

type NaniMiddlewareConfig = {
  billing?: {
    type?: "token";
    customer: string;
    meters: {
      input?: string;
      output?: string;
    };
  };
};

class NaniAgentToolkit {
  private _nani: NaniAPI;

  tools: { [key: string]: CoreTool };

  constructor({
    secretKey,
    configuration,
  }: {
    secretKey: string;
    configuration: Configuration;
  }) {
    this._nani = new NaniAPI(secretKey);
    this.tools = {};

    const filteredTools = tools.filter((tool) =>
      isToolAllowed(tool, configuration),
    );

    filteredTools.forEach((tool) => {
      // @ts-ignore
      this.tools[tool.method] = NaniTool(
        this._nani,
        tool.method,
        tool.description,
        tool.parameters,
      );
    });
  }

  getTools(): { [key: string]: CoreTool } {
    return this.tools;
  }
}

export default NaniAgentToolkit;
