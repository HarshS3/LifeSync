import { Suspense, useMemo } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Canvas } from '@react-three/fiber'
import { Html, OrbitControls, useGLTF } from '@react-three/drei'
import { Color } from 'three'

function clamp01(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return 0
  return Math.max(0, Math.min(1, x))
}

function normToken(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[_-]+/g, '')
}

function blendColorsHex(a, b, t) {
  const A = new Color(a)
  const B = new Color(b)
  return A.lerp(B, clamp01(t))
}

function heatColor(t, { base = '#0b0f14', hot = '#ff4d2d', gamma = 0.65 } = {}) {
  const x = clamp01(t)
  const eased = x ** gamma
  return blendColorsHex(base, hot, eased)
}

function resolveRegionKeyFromName(name, regionKeys) {
  const n = normToken(name)
  if (!n) return null
  for (const k of regionKeys) {
    const kk = normToken(k)
    if (!kk) continue
    if (n.includes(kk)) return k
  }
  return null
}

function GlbModel({ url, intensityByRegion, regionKeys, palette }) {
  const gltf = useGLTF(url)

  const scene = useMemo(() => {
    const cloned = gltf.scene.clone(true)
    const I = intensityByRegion || {}
    const keys = Array.isArray(regionKeys) && regionKeys.length
      ? regionKeys
      : Object.keys(I)

    // Apply per-mesh/per-material tint by name matching.
    // This requires the GLB to have separate meshes/materials named like "chest", "back", etc.
    cloned.traverse((obj) => {
      const isMesh = obj && (obj.isMesh || obj.type === 'SkinnedMesh')
      if (!isMesh) return

      const mesh = obj
      const materialList = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      if (!materialList[0]) return

      const matched =
        resolveRegionKeyFromName(mesh.name, keys) ||
        resolveRegionKeyFromName(materialList[0]?.name, keys)

      if (!matched) return

      const t = clamp01(I[matched])
      const tint = heatColor(t, palette)

      const nextMaterials = materialList.map((m) => {
        if (!m) return m
        const mm = m.clone()
        if (mm.color) mm.color = tint.clone()
        if (mm.emissive) mm.emissive = tint.clone().multiplyScalar(0.35)
        mm.needsUpdate = true
        return mm
      })

      mesh.material = Array.isArray(mesh.material) ? nextMaterials : nextMaterials[0]
    })

    return cloned
  }, [gltf.scene, intensityByRegion, regionKeys, palette])

  return <primitive object={scene} />
}

export default function GlbModelViewer({
  src,
  intensityByRegion,
  height = 420,
  title = '3D Preview',
  subtitle = 'Drag to rotate, scroll to zoom',
  regionKeys = [
    'shoulders',
    'chest',
    'back',
    'biceps',
    'triceps',
    'forearms',
    'core',
    'glutes',
    'quads',
    'hamstrings',
    'calves',
  ],
  palette = { base: '#0b0f14', hot: '#ff4d2d', gamma: 0.65 },
}) {
  if (!src) {
    return (
      <Box sx={{ p: 3, border: '1px dashed #d1d5db', borderRadius: 2, bgcolor: '#fafafa' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#111827' }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>
          No model source provided.
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ border: '1px solid #e5e7eb', borderRadius: 2, overflow: 'hidden', bgcolor: '#0b0f14' }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#f9fafb' }}>
          {title}
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(249,250,251,0.72)' }}>
          {subtitle}
        </Typography>
      </Box>

      <Box sx={{ height, position: 'relative' }}>
        <Canvas camera={{ position: [0, 0.8, 2.2], fov: 45 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[3, 4, 2]} intensity={1.2} />

          <Suspense
            fallback={
              <Html center>
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'rgba(17,24,39,0.85)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'rgba(249,250,251,0.92)',
                    fontSize: 12,
                    letterSpacing: '0.01em',
                  }}
                >
                  Loading model…
                </div>
              </Html>
            }
          >
            <group position={[0, -0.2, 0]}>
              <GlbModel url={src} intensityByRegion={intensityByRegion} regionKeys={regionKeys} palette={palette} />
            </group>
          </Suspense>

          <OrbitControls enablePan enableZoom enableRotate makeDefault />
        </Canvas>
      </Box>
    </Box>
  )
}
