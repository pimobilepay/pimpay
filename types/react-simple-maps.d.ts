// Type declaration file for react-simple-maps v3
// Place this file at: types/react-simple-maps.d.ts
// Then add "typeRoots": ["./types", "./node_modules/@types"] in tsconfig.json

declare module "react-simple-maps" {
  import { ReactNode, CSSProperties, SVGProps } from "react";

  // --- Common Types ---
  export type Point = [number, number];

  export interface ProjectionConfig {
    scale?: number;
    center?: Point;
    parallels?: [number, number];
    rotate?: [number, number, number];
  }

  // --- ComposableMap ---
  export interface ComposableMapProps extends SVGProps<SVGSVGElement> {
    projection?: string | Function;
    projectionConfig?: ProjectionConfig;
    width?: number;
    height?: number;
    style?: CSSProperties;
    className?: string;
    children?: ReactNode;
  }
  export function ComposableMap(props: ComposableMapProps): JSX.Element;

  // --- ZoomableGroup ---
  export interface ZoomableGroupProps {
    center?: Point;
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    translateExtent?: [[number, number], [number, number]];
    onMoveStart?: (event: { coordinates: Point; zoom: number }) => void;
    onMove?: (event: { x: number; y: number; zoom: number; dragging: boolean }) => void;
    onMoveEnd?: (event: { coordinates: Point; zoom: number }) => void;
    style?: CSSProperties;
    className?: string;
    children?: ReactNode;
  }
  export function ZoomableGroup(props: ZoomableGroupProps): JSX.Element;

  // --- Geographies ---
  export interface GeographiesProps {
    geography: string | Record<string, unknown>;
    children: (props: { geographies: Geography[] }) => ReactNode;
    parseGeographies?: (features: unknown[]) => Geography[];
    style?: CSSProperties;
    className?: string;
  }
  export function Geographies(props: GeographiesProps): JSX.Element;

  // --- Geography ---
  export interface Geography {
    rsmKey: string;
    svgPath: string;
    properties: Record<string, unknown>;
    type: string;
    id: string | number;
    geometry: Record<string, unknown>;
  }

  export interface GeographyProps extends SVGProps<SVGPathElement> {
    geography: Geography;
    style?: {
      default?: CSSProperties;
      hover?: CSSProperties;
      pressed?: CSSProperties;
    };
    className?: string;
  }
  export function Geography(props: GeographyProps): JSX.Element;

  // --- Marker ---
  export interface MarkerProps extends SVGProps<SVGGElement> {
    coordinates: Point;
    style?: {
      default?: CSSProperties;
      hover?: CSSProperties;
      pressed?: CSSProperties;
    };
    className?: string;
    children?: ReactNode;
  }
  export function Marker(props: MarkerProps): JSX.Element;

  // --- Line ---
  export interface LineProps extends SVGProps<SVGPathElement> {
    from: Point;
    to: Point;
    coordinates?: Point[];
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
    style?: CSSProperties;
    className?: string;
  }
  export function Line(props: LineProps): JSX.Element;

  // --- Annotation ---
  export interface AnnotationProps {
    subject: Point;
    dx?: number;
    dy?: number;
    curve?: number;
    connectorProps?: SVGProps<SVGPathElement>;
    style?: CSSProperties;
    className?: string;
    children?: ReactNode;
  }
  export function Annotation(props: AnnotationProps): JSX.Element;

  // --- Sphere ---
  export interface SphereProps extends SVGProps<SVGPathElement> {
    id?: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    style?: CSSProperties;
    className?: string;
  }
  export function Sphere(props: SphereProps): JSX.Element;

  // --- Graticule ---
  export interface GraticuleProps extends SVGProps<SVGPathElement> {
    step?: [number, number];
    round?: boolean;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    style?: CSSProperties;
    className?: string;
  }
  export function Graticule(props: GraticuleProps): JSX.Element;
}
