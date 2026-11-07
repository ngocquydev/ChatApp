declare module 'omggif' {
  export class GifReader {
    readonly width: number;
    readonly height: number;
    constructor(buf: Buffer | Uint8Array);
    numFrames(): number;
    loopCount(): number;
    frameInfo(frameNumber: number): {
      x: number;
      y: number;
      width: number;
      height: number;
      has_local_palette: boolean;
      palette_offset: number | null;
      data_offset: number;
      data_length: number;
      transparent_index: number | null;
      interlaced: boolean;
      delay: number;
      disposal: number;
    };
    decodeAndBlitFrameRGBA(frameNumber: number, pixelsBuffer: Buffer | Uint8Array): void;
  }

  export class GifWriter {
    constructor(buf: Buffer | Uint8Array, width: number, height: number, options?: { loop?: number });
    addFrame(x: number, y: number, width: number, height: number, indexedPixels: Buffer | Uint8Array, options?: { palette?: number[]; delay?: number }): number;
    end(): number;
  }

  const omggif: {
    GifReader: typeof GifReader;
    GifWriter: typeof GifWriter;
  };

  export default omggif;
}

