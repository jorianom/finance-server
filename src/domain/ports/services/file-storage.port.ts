// Port: IFileStorage

export interface IFileStorage {
  upload(path: string, buffer: Buffer, contentType: string): Promise<string>;
}
