import { useEffect, useRef } from "react"
import { Camera, Mesh, Program, Renderer, Sphere } from "ogl"

// ── GLSL Shaders ────────────────────────────────────────────────────────────

const vertex = /* glsl */ `
  attribute vec3 position;
  attribute vec3 normal;

  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform mat3 normalMatrix;
  uniform float uTime;
  uniform float uAmplitude;

  varying vec3 vNormal;
  varying vec3 vPos;
  varying float vNoise;

  // Simplex 3D noise
  vec3 mod289v3(vec3 x){ return x - floor(x*(1.0/289.0))*289.0; }
  vec4 mod289v4(vec4 x){ return x - floor(x*(1.0/289.0))*289.0; }
  vec4 permute(vec4 x){ return mod289v4(((x*34.0)+1.0)*x); }

  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0= v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1= min(g.xyz, l.zxy);
    vec3 i2= max(g.xyz, l.zxy);
    vec3 x1= x0 - i1 + C.xxx;
    vec3 x2= x0 - i2 + C.yyy;
    vec3 x3= x0 - 0.5;
    i = mod289v3(i);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    vec4 j = p - 49.0*floor(p*(1.0/7.0)*(1.0/7.0));
    vec4 x_ = floor(j*(1.0/7.0));
    vec4 y_ = floor(j - 7.0*x_);
    vec4 xn = x_*(1.0/7.0) - 6.0/14.0;
    vec4 yn = y_*(1.0/7.0) - 6.0/14.0;
    vec4 zn = 1.0 - abs(xn) - abs(yn);
    vec4 b0 = vec4(xn.xy, yn.xy);
    vec4 b1 = vec4(xn.zw, yn.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(zn, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, zn.x);
    vec3 p1 = vec3(a0.zw, zn.y);
    vec3 p2 = vec3(a1.xy, zn.z);
    vec3 p3 = vec3(a1.zw, zn.w);
    vec4 norm = inversesqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }

  void main(){
    // Layered noise for organic shape
    float n1 = snoise(position * 1.8 + uTime * 0.35);
    float n2 = snoise(position * 3.2 - uTime * 0.22) * 0.45;
    float n  = n1 + n2;

    // Voice drives extra deformation
    float disp = n * (0.14 + uAmplitude * 0.38);
    vec3  displaced = position + normal * disp;

    vNormal = normalize(normalMatrix * (normal + vec3(n * 0.18)));
    vPos    = displaced;
    vNoise  = n * 0.5 + 0.5;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`

const fragment = /* glsl */ `
  precision highp float;

  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform vec3  uGlow;
  uniform float uTime;
  uniform float uAmplitude;

  varying vec3  vNormal;
  varying vec3  vPos;
  varying float vNoise;

  void main(){
    vec3 viewDir = normalize(-vPos);
    float fresnel = pow(1.0 - max(0.0, dot(normalize(vNormal), viewDir)), 2.5);

    // Surface colour
    vec3 col = mix(uColorA, uColorB, vNoise);

    // Rim glow — stronger when voice active
    float glowAmt = (1.6 + uAmplitude * 5.0);
    col += uGlow * fresnel * glowAmt;

    // Subtle pulse
    float pulse = 0.5 + 0.5 * sin(uTime * 1.8);
    col += uColorA * 0.06 * pulse;

    // Shimmer from voice
    col += uColorB * uAmplitude * 0.4;

    float alpha = 0.55 + fresnel * 0.45 + uAmplitude * 0.12;

    gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  }
`

// ── Types ────────────────────────────────────────────────────────────────────

export interface VoicePoweredOrbProps {
  enableVoiceControl?: boolean
  /** 0 = purple/recording, 240 = blue/idle */
  hue?: number
  voiceSensitivity?: number
  maxRotationSpeed?: number
  maxHoverIntensity?: number
  className?: string
  onVoiceDetected?: (detected: boolean) => void
}

// ── Helper: hue → three RGB vec3 tuples ─────────────────────────────────────

function paletteFromHue(hue: number) {
  if (hue < 100) {
    // Purple / recording
    return {
      colorA: [0.486, 0.227, 0.929] as [number, number, number], // #7C3AED
      colorB: [0.627, 0.373, 0.980] as [number, number, number], // #A05EFA
      glow:   [0.588, 0.196, 1.000] as [number, number, number], // #9632FF
    }
  }
  // Blue / idle
  return {
    colorA: [0.145, 0.380, 0.922] as [number, number, number], // #2563EB
    colorB: [0.290, 0.557, 0.980] as [number, number, number], // #4A8EFA
    glow:   [0.196, 0.471, 1.000] as [number, number, number], // #3278FF
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function VoicePoweredOrb({
  enableVoiceControl = false,
  hue = 240,
  voiceSensitivity = 1.5,
  maxRotationSpeed = 1.2,
  maxHoverIntensity = 0.8,
  className,
  onVoiceDetected,
}: VoicePoweredOrbProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Keep mutable refs so animation loop always has latest values
  const hueRef           = useRef(hue)
  const sensitivityRef   = useRef(voiceSensitivity)
  const maxRotRef        = useRef(maxRotationSpeed)
  const maxHoverRef      = useRef(maxHoverIntensity)
  const onVoiceRef       = useRef(onVoiceDetected)

  const analyserRef      = useRef<AnalyserNode | null>(null)
  const streamRef        = useRef<MediaStream | null>(null)
  const amplitudeRef     = useRef(0)
  const voiceActiveRef   = useRef(false)

  // Keep latest prop values without re-creating WebGL
  useEffect(() => { hueRef.current = hue },             [hue])
  useEffect(() => { sensitivityRef.current = voiceSensitivity }, [voiceSensitivity])
  useEffect(() => { maxRotRef.current = maxRotationSpeed },      [maxRotationSpeed])
  useEffect(() => { maxHoverRef.current = maxHoverIntensity },   [maxHoverIntensity])
  useEffect(() => { onVoiceRef.current = onVoiceDetected },      [onVoiceDetected])

  // ── Microphone ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (enableVoiceControl) {
      navigator.mediaDevices
        .getUserMedia({ audio: true, video: false })
        .then((stream) => {
          streamRef.current = stream
          const ctx = new AudioContext()
          const src = ctx.createMediaStreamSource(stream)
          const analyser = ctx.createAnalyser()
          analyser.fftSize = 256
          analyser.smoothingTimeConstant = 0.75
          src.connect(analyser)
          analyserRef.current = analyser
        })
        .catch(() => { /* mic not available — orb still animates */ })
    } else {
      analyserRef.current = null
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [enableVoiceControl])

  // ── WebGL (runs once) ──────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const renderer = new Renderer({
      dpr: Math.min(window.devicePixelRatio, 2),
      alpha: true,
    })
    const gl = renderer.gl
    gl.clearColor(0, 0, 0, 0)
    Object.assign(gl.canvas.style, { width: "100%", height: "100%", display: "block" })
    container.appendChild(gl.canvas)

    const camera = new Camera(gl, { fov: 42 })
    camera.position.set(0, 0, 3.8)

    const onResize = () => {
      const w = container.clientWidth || 1
      const h = container.clientHeight || 1
      renderer.setSize(w, h)
      camera.perspective({ aspect: w / h })
    }
    window.addEventListener("resize", onResize)
    onResize()

    // ── Geometry ──
    const geometry = new Sphere(gl, { radius: 1, widthSegments: 64, heightSegments: 64 })

    // ── Program ───
    const palette = paletteFromHue(hueRef.current)
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime:      { value: 0 },
        uAmplitude: { value: 0 },
        uColorA:    { value: palette.colorA },
        uColorB:    { value: palette.colorB },
        uGlow:      { value: palette.glow },
      },
      transparent: true,
      depthTest:   false,
    })

    const mesh = new Mesh(gl, { geometry, program })

    // ── Animation loop ────
    let raf = 0
    let elapsed = 0
    let last = performance.now()
    const freqData = new Uint8Array(256)

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = (now - last) * 0.001
      last = now
      elapsed += dt

      // Update palette if hue changed
      const pal = paletteFromHue(hueRef.current)
      ;(program.uniforms as Record<string, { value: unknown }>).uColorA.value = pal.colorA
      ;(program.uniforms as Record<string, { value: unknown }>).uColorB.value = pal.colorB
      ;(program.uniforms as Record<string, { value: unknown }>).uGlow.value   = pal.glow

      // Voice amplitude
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(freqData)
        const avg = freqData.reduce((s, v) => s + v, 0) / freqData.length
        const raw = Math.min(1, (avg / 100) * sensitivityRef.current)
        amplitudeRef.current += (raw - amplitudeRef.current) * 0.12

        const detected = raw > 0.04
        if (detected !== voiceActiveRef.current) {
          voiceActiveRef.current = detected
          onVoiceRef.current?.(detected)
        }
      } else {
        amplitudeRef.current *= 0.94
      }

      const amp = amplitudeRef.current * maxHoverRef.current

      ;(program.uniforms as Record<string, { value: unknown }>).uTime.value      = elapsed
      ;(program.uniforms as Record<string, { value: unknown }>).uAmplitude.value = amp

      // Rotation — speed up with voice
      const speed = (0.004 + amp * 0.012) * maxRotRef.current
      mesh.rotation.y += speed
      mesh.rotation.x += speed * 0.38

      renderer.render({ scene: mesh, camera })
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", onResize)
      if (container.contains(gl.canvas)) container.removeChild(gl.canvas)
    }
  }, []) // intentionally empty — props are accessed via refs

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%" }}
    />
  )
}
