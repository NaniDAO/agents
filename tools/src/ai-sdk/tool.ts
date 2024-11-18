import type { CoreTool } from "ai";
import { tool } from "ai";
import { z } from "zod";
import NaniAPI from "../api";

export default function NaniTool(
  naniAPI: NaniAPI,
  method: string,
  description: string,
  schema: z.ZodObject<any, any, any, any, { [x: string]: any }>,
): CoreTool {
  return tool({
    description: description,
    parameters: schema,
    execute: (arg: z.output<typeof schema>) => {
      return naniAPI.run(method, arg);
    },
  });
}
