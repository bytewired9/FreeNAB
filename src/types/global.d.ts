export {};

declare global {
  interface Window {
    electronAPI: {
      getBasePath: () => Promise<string>;
      readLocalFile: (filePath: string) => Promise<string>;
    };
  }
}
