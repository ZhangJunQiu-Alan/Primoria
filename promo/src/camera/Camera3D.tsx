import type { CSSProperties, ReactNode } from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { FPS } from '../timeline';

export const cameraEase = Easing.bezier(0.83, 0, 0.17, 1);
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export type Point3D = { x: number; y: number; z: number };
export type Camera = Point3D & { yaw: number; pitch: number; focalLength: number; focusDepth: number };

export function project(point: Point3D, camera: Camera) {
  const dx = point.x - camera.x;
  const dy = point.y - camera.y;
  const dz = point.z - camera.z;
  const x = dx * Math.cos(camera.yaw) - dz * Math.sin(camera.yaw);
  const z = dx * Math.sin(camera.yaw) + dz * Math.cos(camera.yaw);
  const y = dy * Math.cos(camera.pitch) - z * Math.sin(camera.pitch);
  const depth = dy * Math.sin(camera.pitch) + z * Math.cos(camera.pitch);
  const scale = camera.focalLength / Math.max(1, camera.focalLength + depth);
  return { x: 960 + x * scale, y: 540 + y * scale, scale, depth, blur: clamp(Math.abs(depth - camera.focusDepth) * 0.008, 0, 12) };
}

export function CameraPlane({ children, duration, style }: { children: ReactNode; duration: number; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  const move = interpolate(frame, [0, duration], [-0.35, 0.35], { easing: cameraEase, extrapolateRight: 'clamp' });
  return <div style={{ position: 'absolute', inset: 0, transform: `perspective(2200px) rotateY(${move}deg) scale(${1 + frame / FPS * 0.015})`, transformOrigin: '50% 48%', ...style }}>{children}</div>;
}
