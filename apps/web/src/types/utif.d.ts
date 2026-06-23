declare module "utif" {
  interface IFD {
    width: number;
    height: number;
    [key: string]: unknown;
  }
  function decode(buffer: Buffer | Uint8Array): IFD[];
  function decodeImage(buffer: Buffer | Uint8Array, ifd: IFD): void;
  function toRGBA8(ifd: IFD): Uint8Array;
}
