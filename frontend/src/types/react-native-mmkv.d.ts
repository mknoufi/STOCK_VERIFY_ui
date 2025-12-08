declare module "react-native-mmkv" {
  export class MMKV {
    constructor(config?: {
      id?: string;
      path?: string;
      encryptionKey?: string;
    });
    set: (key: string, value: string | number | boolean) => void;
    getString: (key: string) => string | undefined;
    delete: (key: string) => void;
  }
}
