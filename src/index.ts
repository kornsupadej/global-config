import chalk from "chalk";
import { globSync } from "glob";
import merge from "deepmerge";
import path from "path";
import { pathToFileURL } from "url";

const isArray = (item: any) => Array.isArray(item);

const isLiteralObject = (item: any) =>
  typeof item === "object" && !Array.isArray(item) && item !== null;

const mergeConfig = (defs: any, envs: any, ...rest: any) =>
  merge(defs, envs, ...rest);

const resolveConfig = (conf: any) => {
  if (typeof conf !== "object") return conf;
  return Object.keys(conf)
    .map((v: any) => {
      const envs = /^@(.*)/.exec(v);
      const cenvs = /^@(.*?):([^:]*)/.exec(v);
      const value: any = isLiteralObject(conf[v])
        ? resolveConfig(conf[v])
        : isArray(conf[v])
        ? conf[v].map((cf) => resolveConfig(cf))
        : conf[v];
      if (cenvs && cenvs[1] && cenvs[2]) {
        return { [cenvs[1]]: process.env[cenvs[2].toUpperCase()] || value };
      } else if (envs && envs[1]) {
        return { [envs[1]]: process.env[envs[1].toUpperCase()] || value };
      } else {
        return { [v]: value };
      }
    })
    .reduce((acc, curr) => {
      return { ...acc, ...curr };
    }, {});
};

const readDefaultConfig = import(
  pathToFileURL(path.join(process.cwd(), `configs/default.ts`)).href
);

const readDevelopmentConfig = import(
  pathToFileURL(path.join(process.cwd(), `configs/development.ts`)).href
);

const readProductionConfig = import(
  pathToFileURL(path.join(process.cwd(), `configs/production.ts`)).href
);

const readConfigs = async () => {
  const defs = await readDefaultConfig.then((module) => module.default);
  const envs =
    process.env["NODE_ENV"] === "production"
      ? await readProductionConfig.then((module) => module.default)
      : await readDevelopmentConfig.then((module) => module.default);
  return { defs, envs };
};

const validateEnv = () => {
  const files = globSync(`./configs/${process.env["NODE_ENV"]}.ts`);
  if (!files.length) {
    if (process.env["NODE_ENV"]) {
      console.error(
        chalk.red(
          '+ Error: No configuration file found for "' +
            process.env["NODE_ENV"] +
            '" environment, using development instead'
        )
      );
    } else {
      console.error(
        chalk.red(
          `+ Error: NODE_ENV is not defined. Using default development environment`
        )
      );
    }
    process.env["NODE_ENV"] = "development";
  }
};

export const initGlobalConfig = async () => {
  validateEnv();
  const { defs, envs } = await readConfigs();
  return resolveConfig(mergeConfig(defs, envs));
};
initGlobalConfig();
