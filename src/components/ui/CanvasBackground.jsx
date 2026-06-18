'use client';
import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const DotMatrix = ({
  colors = [[0, 0, 0]],
  opacities = [0.04, 0.04, 0.04, 0.04, 0.04, 0.08, 0.08, 0.08, 0.08, 0.14],
  totalSize = 20,
  dotSize = 2,
  shader = '',
  center = ['x', 'y'],
}) => {
  const uniforms = useMemo(() => {
    let c = [colors[0], colors[0], colors[0], colors[0], colors[0], colors[0]];
    if (colors.length === 2) c = [colors[0], colors[0], colors[0], colors[1], colors[1], colors[1]];
    else if (colors.length === 3) c = [colors[0], colors[0], colors[1], colors[1], colors[2], colors[2]];
    return {
      u_colors:     { value: c.map(v => [v[0]/255, v[1]/255, v[2]/255]), type: 'uniform3fv' },
      u_opacities:  { value: opacities, type: 'uniform1fv' },
      u_total_size: { value: totalSize,  type: 'uniform1f' },
      u_dot_size:   { value: dotSize,    type: 'uniform1f' },
      u_reverse:    { value: shader.includes('u_reverse_active') ? 1 : 0, type: 'uniform1i' },
    };
  }, [colors, opacities, totalSize, dotSize, shader]);

  return (
    <Shader
      uniforms={uniforms}
      source={`
        precision mediump float;
        in vec2 fragCoord;
        uniform float u_time;
        uniform float u_opacities[10];
        uniform vec3 u_colors[6];
        uniform float u_total_size;
        uniform float u_dot_size;
        uniform vec2 u_resolution;
        uniform int u_reverse;
        out vec4 fragColor;
        float PHI = 1.61803398874989484820459;
        float random(vec2 xy){ return fract(tan(distance(xy*PHI,xy)*0.5)*xy.x); }
        void main(){
          vec2 st = fragCoord.xy;
          ${center.includes('x') ? 'st.x -= abs(floor((mod(u_resolution.x, u_total_size) - u_dot_size) * 0.5));' : ''}
          ${center.includes('y') ? 'st.y -= abs(floor((mod(u_resolution.y, u_total_size) - u_dot_size) * 0.5));' : ''}
          float opacity = step(0.0, st.x) * step(0.0, st.y);
          vec2 st2 = vec2(int(st.x/u_total_size), int(st.y/u_total_size));
          float show_offset = random(st2);
          float rand = random(st2 * floor((u_time/5.0) + show_offset + 5.0));
          opacity *= u_opacities[int(rand*10.0)];
          opacity *= 1.0 - step(u_dot_size/u_total_size, fract(st.x/u_total_size));
          opacity *= 1.0 - step(u_dot_size/u_total_size, fract(st.y/u_total_size));
          vec3 color = u_colors[int(show_offset*6.0)];
          vec2 cg = u_resolution/2.0/u_total_size;
          float dist = distance(cg, st2);
          float oi = dist*0.01 + random(st2)*0.15;
          float md = distance(cg, vec2(0.0));
          float oo = (md-dist)*0.02 + random(st2+42.0)*0.2;
          if(u_reverse==1){
            opacity *= 1.0 - step(oo, u_time*0.5);
            opacity *= clamp(step(oo+0.1, u_time*0.5)*1.25, 1.0, 1.25);
          } else {
            opacity *= step(oi, u_time*0.5);
            opacity *= clamp((1.0-step(oi+0.1, u_time*0.5))*1.25, 1.0, 1.25);
          }
          fragColor = vec4(color, opacity);
          fragColor.rgb *= fragColor.a;
        }`}
    />
  );
};

const ShaderMesh = ({ source, uniforms }) => {
  const { size } = useThree();
  const ref = useRef(null);

  useFrame(({ clock }) => {
    if (ref.current) ref.current.material.uniforms.u_time.value = clock.getElapsedTime();
  });

  const material = useMemo(() => {
    const p = {};
    for (const name in uniforms) {
      const u = uniforms[name];
      if (u.type === 'uniform3fv') p[name] = { value: u.value.map(v => new THREE.Vector3().fromArray(v)) };
      else p[name] = { value: u.value };
    }
    p.u_time       = { value: 0 };
    p.u_resolution = { value: new THREE.Vector2(size.width * 2, size.height * 2) };
    return new THREE.ShaderMaterial({
      vertexShader: `
        precision mediump float;
        uniform vec2 u_resolution;
        out vec2 fragCoord;
        void main(){
          gl_Position = vec4(position.xy, 0.0, 1.0);
          fragCoord = (position.xy + vec2(1.0)) * 0.5 * u_resolution;
          fragCoord.y = u_resolution.y - fragCoord.y;
        }`,
      fragmentShader: source,
      uniforms: p,
      glslVersion: THREE.GLSL3,
      blending: THREE.CustomBlending,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneFactor,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height, source]);

  return (
    <mesh ref={ref}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

const Shader = ({ source, uniforms }) => (
  <Canvas className="absolute inset-0 h-full w-full">
    <ShaderMesh source={source} uniforms={uniforms} />
  </Canvas>
);

// Default export — drop this anywhere for the full dark animated background
export default function CanvasBackground() {
  return (
    <div className="absolute inset-0 z-0 bg-black">
      <div className="absolute inset-0">
        <div className="h-full w-full relative">
          <DotMatrix
            colors={[[255, 255, 255], [255, 255, 255]]}
            dotSize={6}
            opacities={[0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1]}
            center={['x', 'y']}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
        </div>
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,0,0,0.85)_0%,_transparent_70%)]" />
      <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-black to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-1/4 bg-gradient-to-t from-black to-transparent" />
    </div>
  );
}
