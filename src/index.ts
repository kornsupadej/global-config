import chalk from "chalk";
import { globSync } from "glob";
import merge from "deepmerge";
import path from "path";

const isArray = (item: any) => Array.isArray(item);

const isLiteralObject = (item: any) =>
  typeof item === "object" && !Array.isArray(item) && item !== null;

const mergeConfig = (...args: any) => merge(args[0], args[1]);

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

const readConfigs = () => {
  const patterns: string[] = globSync(
    path.resolve(
      __dirname,
      "configs",
      `**/{default,${process.env["NODE_ENV"]}}.{js,ts}`
    )
  );
  return patterns.reduce((confs: Record<string, any>, file: string) => {
    const module = require(file);
    const conf = module.default || module;

    confs[path.basename(file, path.extname(file))] = conf;

    return conf;
  }, {});
};

const validateEnv = (): void => {
  const files = globSync(
    path.resolve(__dirname, "configs", `**/${process.env["NODE_ENV"]}.{js,ts}`)
  );
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

export const initGlobalConfig = () => {
  validateEnv();
  const conf = readConfigs();
  return resolveConfig(mergeConfig(conf));
};
