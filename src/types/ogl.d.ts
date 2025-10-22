declare module 'ogl' {
  export class Renderer {
    gl: WebGLRenderingContext | WebGL2RenderingContext;
    constructor(options?: { dpr?: number; alpha?: boolean; antialias?: boolean });
    setSize(width: number, height: number): void;
  render(options: { scene: Mesh; camera?: unknown }): void;
  }

  export class Program {
    gl: WebGLRenderingContext | WebGL2RenderingContext;
  uniforms: Record<string, { value: unknown }>;
    constructor(
      gl: WebGLRenderingContext | WebGL2RenderingContext,
  options: { vertex: string; fragment: string; uniforms?: Record<string, { value: unknown }> }
    );
  }

  export class Triangle {
    constructor(gl: WebGLRenderingContext | WebGL2RenderingContext);
  }

  export class Mesh {
    constructor(
      gl: WebGLRenderingContext | WebGL2RenderingContext,
  options: { geometry: unknown; program: Program }
    );
  }

  export class Texture {
    texture?: WebGLTexture | null;
  image: unknown;
    width: number;
    height: number;
    minFilter: number;
    magFilter: number;
    wrapS: number;
    wrapT: number;
    flipY: boolean;
    generateMipmaps: boolean;
    format: number;
    type: number;
    needsUpdate: boolean;
  constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, options?: unknown);
  }
}
