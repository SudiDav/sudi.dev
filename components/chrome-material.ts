import * as THREE from 'three'

/**
 * The S logo's finish: polished, iridescent chrome tinted by the accent, with a
 * faint inner glow. It shines from the scene's environment map, so the scene
 * needs one (both logo scenes use a RoomEnvironment).
 */
export function chromeMaterial(accent: string) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(accent).lerp(new THREE.Color('#ffffff'), 0.35),
    metalness: 0.8,
    roughness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    iridescence: 0.9,
    iridescenceIOR: 1.5,
    iridescenceThicknessRange: [180, 560],
    emissive: new THREE.Color(accent),
    emissiveIntensity: 0.32,
    envMapIntensity: 2.6,
  })
}
