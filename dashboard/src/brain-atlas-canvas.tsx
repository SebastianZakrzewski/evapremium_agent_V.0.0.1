import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import type {
  ContextGraphEdge,
  ContextGraphNode,
} from './dashboard-api';
import {
  contextNodeState,
  type ContextTurnFrame,
} from './context-turn-frames';

type Point = { x: number; y: number; z: number; tissue: 'cortex' | 'cerebellum' | 'stem' };

type SceneNode = Point & {
  slug: string;
  title: string;
  state: 'idle' | 'candidate' | 'hit' | 'miss';
};

const BRAIN = buildBrain();

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function cerebrumDistance(x: number, y: number, z: number): number {
  const side = x >= 0 ? 1 : -1;
  const dx = (x - side * 0.1) / 1.05;
  const temporal = y < 0.05 && Math.abs(x) > 0.32;
  const dy = temporal ? (y + 0.22) / 0.72 : (y - 0.06) / 0.8;
  const dz = (z + 0.02) / 0.98;
  return Math.hypot(dx, dy, dz);
}

function buildBrain(): Point[] {
  const random = mulberry32(0x5f3759df);
  const points: Point[] = [];
  let guard = 0;
  while (points.length < 2400 && guard < 80000) {
    guard += 1;
    const x = random() * 2.6 - 1.3;
    const y = random() * 2.2 - 1.1;
    const z = random() * 2.3 - 1.15;
    if (Math.abs(x) < 0.07) {
      continue;
    }
    const wrinkle =
      0.035 * Math.sin(x * 11 + y * 5) * Math.sin(z * 9 + x * 3);
    const distance = cerebrumDistance(x, y, z);
    if (distance > 0.9 + wrinkle && distance < 1.02 + wrinkle) {
      points.push({ x, y, z, tissue: 'cortex' });
    }
  }
  guard = 0;
  while (points.length < 2900 && guard < 40000) {
    guard += 1;
    const x = random() * 1.5 - 0.75;
    const y = random() * 0.9 - 1.15;
    const z = random() * 1.1 - 1.35;
    const dx = x / 0.62;
    const dy = (y + 0.72) / 0.42;
    const dz = (z + 0.82) / 0.5;
    const distance = Math.hypot(dx, dy, dz);
    const ridge = 0.04 * Math.sin(x * 22) * Math.sin(y * 18);
    if (distance > 0.78 + ridge && distance < 1.02) {
      points.push({ x, y, z, tissue: 'cerebellum' });
    }
  }
  for (let index = 0; index < 180; index += 1) {
    const random = mulberry32(0x9e3779b9 + index);
    const angle = random() * Math.PI * 2;
    const radius = 0.05 + random() * 0.12;
    const y = -0.85 - random() * 0.55;
    points.push({
      x: Math.cos(angle) * radius,
      y,
      z: -0.28 + Math.sin(angle) * radius * 0.65,
      tissue: 'stem',
    });
  }
  return points;
}

function snapToCortex(x: number, y: number, z: number): Point {
  const side = x >= 0 ? 1 : -1;
  let localX = x - side * 0.1;
  let localY = y - 0.06;
  let localZ = z + 0.02;
  const length = Math.hypot(localX / 1.05, localY / 0.8, localZ / 0.98) || 1;
  localX = (localX / 1.05 / length) * 1.05 * 0.98;
  localY = (localY / 0.8 / length) * 0.8 * 0.98;
  localZ = (localZ / 0.98 / length) * 0.98 * 0.98;
  return {
    x: localX + side * 0.1,
    y: localY + 0.06,
    z: localZ - 0.02,
    tissue: 'cortex',
  };
}

function placeLeaf(node: ContextGraphNode): Point {
  const side = node.x < 0.5 ? -1 : 1;
  const across = Math.abs(node.x - 0.5) * 2;
  const x = side * (0.22 + across * 0.78);
  const y = (node.y - 0.5) * 1.15;
  const z = Math.cos((node.x - 0.5) * Math.PI) * 0.55 + (0.5 - node.y) * 0.35;
  return snapToCortex(x, y, z);
}

function rotate(
  point: Point,
  yaw: number,
  pitch: number,
): { x: number; y: number; z: number } {
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const x1 = point.x * cosYaw + point.z * sinYaw;
  const z1 = -point.x * sinYaw + point.z * cosYaw;
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);
  return {
    x: x1,
    y: point.y * cosPitch - z1 * sinPitch,
    z: point.y * sinPitch + z1 * cosPitch,
  };
}

function project(
  point: { x: number; y: number; z: number },
  width: number,
  height: number,
  zoom: number,
): { sx: number; sy: number; z: number; scale: number } | null {
  const focal = 3.4;
  if (point.z > focal - 0.35) {
    return null;
  }
  const scale = focal / (focal - point.z);
  return {
    sx: width / 2 + point.x * scale * zoom,
    sy: height / 2 - point.y * scale * zoom,
    z: point.z,
    scale,
  };
}

function tissueColor(tissue: Point['tissue'], light: number): string {
  const tone =
    tissue === 'cortex' ? [196, 150, 156] : tissue === 'cerebellum' ? [168, 124, 132] : [120, 96, 104];
  const red = Math.round(tone[0] * light);
  const green = Math.round(tone[1] * light);
  const blue = Math.round(tone[2] * light);
  return `rgb(${red} ${green} ${blue})`;
}

function nodeColor(state: SceneNode['state']): string {
  if (state === 'hit') {
    return '#fff4cf';
  }
  if (state === 'candidate') {
    return '#e7c27a';
  }
  if (state === 'miss') {
    return '#e07a72';
  }
  return '#8ec6de';
}

function turnSlugs(nodes: ContextGraphNode[], frame: ContextTurnFrame | null): string[] {
  if (frame === null) {
    return [];
  }
  const known = new Set(nodes.map((node) => node.slug));
  const placed: string[] = [];
  for (const slug of frame.path) {
    if (!known.has(slug) || placed[placed.length - 1] === slug) {
      continue;
    }
    placed.push(slug);
  }
  return placed;
}

export function BrainAtlasCanvas({
  nodes,
  edges,
  frame,
}: {
  nodes: ContextGraphNode[];
  edges: ContextGraphEdge[];
  frame: ContextTurnFrame | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef({ nodes, edges, frame });
  sceneRef.current = { nodes, edges, frame };
  const cameraRef = useRef({ yaw: 0.7, pitch: 0.18, zoom: 150, auto: true });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) {
      return;
    }
    const context = canvas.getContext('2d');
    if (context === null) {
      return;
    }
    let frameId = 0;

    function resize() {
      const view = canvas?.parentElement;
      if (canvas === null || view === null || view === undefined) {
        return;
      }
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = view.clientWidth;
      const height = Math.max(520, Math.round(width * 0.62));
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.height = `${height}px`;
    }

    function draw(time: number) {
      if (canvas === null || context === null) {
        return;
      }
      const camera = cameraRef.current;
      if (camera.auto) {
        camera.yaw += 0.0035;
      }
      const ratio = canvas.width / Math.max(canvas.clientWidth, 1);
      const width = canvas.width;
      const height = canvas.height;
      const zoom = camera.zoom * ratio;
      context.clearRect(0, 0, width, height);
      const backdrop = context.createRadialGradient(
        width / 2,
        height / 2,
        width * 0.05,
        width / 2,
        height / 2,
        width * 0.55,
      );
      backdrop.addColorStop(0, '#1a2230');
      backdrop.addColorStop(1, '#07090d');
      context.fillStyle = backdrop;
      context.fillRect(0, 0, width, height);

      const projectedBrain = BRAIN.flatMap((point) => {
        const rotated = rotate(point, camera.yaw, camera.pitch);
        const screen = project(rotated, width, height, zoom);
        return screen === null ? [] : [{ ...screen, tissue: point.tissue }];
      });
      projectedBrain.sort((left, right) => left.z - right.z);
      for (const point of projectedBrain) {
        const light = 0.28 + 0.72 * Math.min(1, Math.max(0, (point.z + 1.1) / 2));
        context.fillStyle = tissueColor(point.tissue, light);
        context.globalAlpha = 0.45 + light * 0.5;
        context.beginPath();
        context.arc(
          point.sx,
          point.sy,
          Math.max(1.1, 2.1 * point.scale) * ratio,
          0,
          Math.PI * 2,
        );
        context.fill();
      }
      context.globalAlpha = 1;

      const scene = sceneRef.current;
      const leaves = scene.nodes.map((node) => {
        const placed = placeLeaf(node);
        return {
          ...placed,
          slug: node.slug,
          title: node.title,
          state: contextNodeState(node.slug, scene.frame),
        };
      });
      const bySlug = new Map(leaves.map((node) => [node.slug, node]));
      const active = new Set(turnSlugs(scene.nodes, scene.frame));
      const pulse = 0.65 + 0.35 * Math.sin(time / 280);

      function screenOf(point: Point) {
        return project(rotate(point, camera.yaw, camera.pitch), width, height, zoom);
      }

      const paint = context;
      function strokePath(
        from: Point,
        to: Point,
        color: string,
        widthPx: number,
        alpha: number,
      ) {
        const start = screenOf(from);
        const end = screenOf(to);
        if (start === null || end === null || paint === null) {
          return;
        }
        const midX = (start.sx + end.sx) / 2;
        const midY = (start.sy + end.sy) / 2;
        const centerX = width / 2;
        const centerY = height / 2;
        const outwardX = midX - centerX;
        const outwardY = midY - centerY;
        const length = Math.hypot(outwardX, outwardY) || 1;
        paint.strokeStyle = color;
        paint.globalAlpha = alpha;
        paint.lineWidth = widthPx * ratio;
        paint.beginPath();
        paint.moveTo(start.sx, start.sy);
        paint.quadraticCurveTo(
          midX + (outwardX / length) * 28 * ratio,
          midY + (outwardY / length) * 28 * ratio,
          end.sx,
          end.sy,
        );
        paint.stroke();
        paint.globalAlpha = 1;
      }

      for (const edge of scene.edges) {
        const from = bySlug.get(edge.source);
        const to = bySlug.get(edge.target);
        if (from === undefined || to === undefined) {
          continue;
        }
        const lit = active.has(edge.source) && active.has(edge.target);
        strokePath(
          from,
          to,
          lit ? '#f0c14a' : 'rgb(176 196 214)',
          lit ? 2.4 : 0.7 + edge.similarity,
          lit ? 0.9 * pulse : 0.28,
        );
      }

      const path = turnSlugs(scene.nodes, scene.frame);
      for (let index = 1; index < path.length; index += 1) {
        const from = bySlug.get(path[index - 1] ?? '');
        const to = bySlug.get(path[index] ?? '');
        if (from === undefined || to === undefined) {
          continue;
        }
        strokePath(from, to, '#ffe7a3', 3.2, 0.95 * pulse);
      }

      const projectedLeaves = leaves
        .flatMap((node) => {
          const screen = screenOf(node);
          return screen === null ? [] : [{ node, screen }];
        })
        .sort((left, right) => left.screen.z - right.screen.z);

      for (const row of projectedLeaves) {
        const pulseScale = row.node.state === 'idle' ? 1 : 0.9 + 0.1 * pulse;
        const radius =
          (row.node.state === 'hit' ? 8 : 5.5) * row.screen.scale * pulseScale;
        const glow = row.node.state === 'idle' ? 12 : 22;
        context.shadowColor = nodeColor(row.node.state);
        context.shadowBlur = glow * ratio;
        context.fillStyle = nodeColor(row.node.state);
        context.beginPath();
        context.arc(row.screen.sx, row.screen.sy, Math.max(3, radius) * ratio, 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = 0;
        if (row.node.state === 'miss') {
          context.strokeStyle = '#ffd0cc';
          context.lineWidth = 1.5 * ratio;
          context.stroke();
        }
        context.fillStyle = row.screen.z > -0.15 ? '#f4f7fb' : 'rgba(244, 247, 251, 0.45)';
        context.font = `${Math.round(13 * ratio)}px Inter, sans-serif`;
        context.textAlign = 'center';
        context.fillText(row.node.title, row.screen.sx, row.screen.sy - (16 + radius) * ratio);
      }
    }

    function loop(time: number) {
      draw(time);
      frameId = window.requestAnimationFrame(loop);
    }

    resize();
    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) {
      observer.observe(canvas.parentElement);
    }
    frameId = window.requestAnimationFrame(loop);

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const camera = cameraRef.current;
      camera.zoom = Math.min(240, Math.max(80, camera.zoom + (event.deltaY > 0 ? -10 : 10)));
    }
    canvas.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      canvas.removeEventListener('wheel', onWheel);
    };
  }, []);

  function drag(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (event.buttons !== 1) {
      return;
    }
    const camera = cameraRef.current;
    camera.auto = false;
    camera.yaw += event.movementX * 0.005;
    camera.pitch = Math.min(0.9, Math.max(-0.7, camera.pitch + event.movementY * 0.005));
  }

  return (
    <div className="brain-atlas">
      <canvas
        ref={canvasRef}
        className="brain-atlas-canvas"
        aria-label="Graf podobieństwa liści"
        onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)}
        onPointerMove={drag}
        onDoubleClick={() => {
          cameraRef.current.auto = true;
          cameraRef.current.yaw = 0.7;
          cameraRef.current.pitch = 0.18;
          cameraRef.current.zoom = 150;
        }}
      />
      <p className="brain-atlas-hint">
        Przeciągnij, aby obrócić. Kółko przybliża. Podwójne kliknięcie wznawia obrót.
      </p>
    </div>
  );
}
