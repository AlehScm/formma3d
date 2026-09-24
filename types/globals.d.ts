// clipper-lib nao publica tipos. Declaramos apenas a superficie que o projeto usa.
declare module 'clipper-lib' {
  export interface IntPoint {
    X: number;
    Y: number;
  }
  export type Path = IntPoint[];
  export type Paths = Path[];

  export const PolyType: { ptSubject: number; ptClip: number };
  export const ClipType: { ctIntersection: number; ctUnion: number; ctDifference: number; ctXor: number };
  export const PolyFillType: { pftEvenOdd: number; pftNonZero: number; pftPositive: number; pftNegative: number };
  export const JoinType: { jtSquare: number; jtRound: number; jtMiter: number };
  export const EndType: { etClosedPolygon: number; etClosedLine: number; etOpenButt: number; etOpenSquare: number; etOpenRound: number };

  export class PolyNode {
    Contour(): Path;
    Childs(): PolyNode[];
    IsHole(): boolean;
  }
  export class PolyTree extends PolyNode {}

  export class Clipper {
    AddPaths(paths: Paths, polyType: number, closed: boolean): boolean;
    Execute(clipType: number, solution: PolyTree | Paths, subjFill?: number, clipFill?: number): boolean;
  }

  export class ClipperOffset {
    constructor(miterLimit?: number, arcTolerance?: number);
    AddPaths(paths: Paths, joinType: number, endType: number): void;
    Execute(solution: Paths, delta: number): void;
  }

  const ClipperLib: {
    PolyType: typeof PolyType;
    ClipType: typeof ClipType;
    PolyFillType: typeof PolyFillType;
    JoinType: typeof JoinType;
    EndType: typeof EndType;
    Clipper: typeof Clipper;
    ClipperOffset: typeof ClipperOffset;
    PolyTree: typeof PolyTree;
    PolyNode: typeof PolyNode;
    Paths: { new (): Paths };
  };
  export default ClipperLib;
}

// Local Font Access API: ainda nao faz parte da lib DOM padrao do TypeScript.
interface FontData {
  readonly postscriptName: string;
  readonly fullName: string;
  readonly family: string;
  readonly style: string;
  blob(): Promise<Blob>;
}

interface Window {
  queryLocalFonts?: (options?: { postscriptNames?: string[] }) => Promise<FontData[]>;
}

// O worker do pdf.js nao tem tipos: so e carregado como fallback quando a
// construcao do Worker falha, e nesse caso registra-se sozinho em globalThis.
declare module 'pdfjs-dist/build/pdf.worker.min.mjs';
