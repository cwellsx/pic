// see https://www.electronjs.org/docs/latest/api/app#appgetpathname

export type ConfigProperty = "documents" | "downloads" | "music" | "pictures" | "videos";

export type ConfigMore = [path: string, enabled: boolean, exists: boolean];

export type Config = {
  paths: {
    documents: boolean;
    downloads: boolean;
    music: boolean;
    pictures: boolean;
    videos: boolean;
  };
  more?: ConfigMore[];
};

const defaultConfig: Config = {
  paths: {
    documents: false,
    downloads: false,
    music: false,
    pictures: false,
    videos: false,
  },
};

export const getDefaultConfig: () => Config = () => {
  return { ...defaultConfig };
};
