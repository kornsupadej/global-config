import chalk from "chalk";
import merge from "deepmerge";
import { globSync } from "glob";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const isArray = (item: any): boolean => Array.isArray(item);

const isLiteralObject = (item: any): boolean =>
  typeof item === "object" && !Array.isArray(item) && item !== null;

const mergeConfig = (...args: any): Record<string, any> =>
  merge(args[0], args[1] ?? args[0]);

const resolveConfig = (conf: any): Record<string, any> => {
  if (typeof conf !== "object") return conf;
  return Object.keys(conf)
    .map((v: any) => {
      const envs = /^@(.*)/.exec(v);
      const cenvs = /^@(.*?):([^:]*)/.exec(v);
      const value: any = isLiteralObject(conf[v])
        ? resolveConfig(conf[v])
        : isArray(conf[v])
        ? conf[v].map((cf: any) => resolveConfig(cf))
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

const validateConfig = (
  rootDir: string,
  confDir: string
): Record<"cpath" | "epath", any> => {
  /** validate configs directory & default config file */
  const path: string = join(rootDir, confDir);
  const cfile: string[] = globSync(`${path}/common.{js,ts}`);
  try {
    if (!cfile.length)
      throw new Error(`common config file not found for ${path}`);
  } catch (e) {
    if (e instanceof Error) {
      console.error(chalk.bgRed(" ENOENT "), chalk.red(e.message));
      console.group();
      console.log(`Please create a directory as suggested below:`);
      console.group();
      console.log(`.`);
      console.log(`└──${confDir}/`);
      console.group();
      console.log(`├── common.(js|ts)`);
      console.log(`├── development.(js|ts)`);
      console.log(`└── production.(js|ts)`);
      console.groupCollapsed();
      process.exit(1);
    }
  }
  /** validate environment configuration file */
  const efile: string[] = globSync(
    `${path}/${process.env["NODE_ENV"]}.{js,ts}`
  );
  if (!efile.length) {
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
  return {
    cpath: cfile[0],
    epath: globSync(`${path}/${process.env["NODE_ENV"]}.{js,ts}`)[0],
  };
};

const dynamicImport = (path: string): Promise<Record<string, any>> =>
  import(pathToFileURL(path).href).then((module) => module.default || module);

const loadConfig = async (paths: {
  cpath: string;
  epath: string;
}): Promise<Record<"cmodule" | "emodule", any>> => {
  const cmodule = await dynamicImport(paths.cpath);
  const emodule = await dynamicImport(paths.epath ?? paths.cpath);
  return { cmodule, emodule };
};

type GlobalConfig = {
  rootDir: string;
  configDir: string;
};
export const initGlobalConfig = async (
  params: GlobalConfig = {
    rootDir: process.cwd(),
    configDir: "configs",
  }
): Promise<Record<string, any>> => {
  const paths = validateConfig(params.rootDir, params.configDir);
  const { cmodule, emodule } = await loadConfig(paths);
  return resolveConfig(mergeConfig(cmodule, emodule));
};
