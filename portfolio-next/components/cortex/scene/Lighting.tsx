import { Environment, Lightformer } from '@react-three/drei'
import { QUALITY, detectTier } from '../config/quality'

const ENV_RESOLUTION = QUALITY[detectTier()].envResolution

/**
 * Cinematic rig (docs/08_lighting_pipeline.md): darkness is default, light reveals form.
 * Cool key + soft fill + a critical cool rim, plus a compact procedural studio
 * environment (built from Lightformers — no network fetch) that supplies the subtle
 * reflections metals need without ever being visible.
 */
export function Lighting() {
  return (
    <>
      <ambientLight intensity={0.12} color="#abc4e0" />
      <hemisphereLight args={['#26374f', '#060a12', 0.32]} />

      {/* Cleaner, stronger key light to drive the clearcoat speculars */}
      <directionalLight
        position={[4.5, 6, 3.5]}
        intensity={2.4}
        color="#eaf2ff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0004}
        shadow-camera-near={0.5}
        shadow-camera-far={22}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
      />

      {/* Intense cool rim — critical edge separation that interacts gorgeously with clearcoat */}
      <directionalLight position={[-5.5, 3.5, -4.5]} intensity={2.8} color="#9ac0ff" />

      {/* Second, lower cool rim on the opposite shoulder */}
      <directionalLight position={[-3.5, -1.5, -5]} intensity={1.2} color="#7fa6ff" />

      {/* Warm soft fill from below to ground the contact shadows */}
      <directionalLight position={[2, -4, 2]} intensity={0.35} color="#ffc48c" />

      <Environment resolution={ENV_RESOLUTION} background={false}>
        <Lightformer form="rect" intensity={2.2} color="#bcd4ff" position={[0, 4, 3]} scale={[9, 6, 1]} />
        <Lightformer
          form="rect"
          intensity={1.3}
          color="#6f9bff"
          position={[-6, 2, -3]}
          scale={[5, 6, 1]}
          rotation={[0, Math.PI / 3, 0]}
        />
        <Lightformer form="ring" intensity={0.7} color="#ffffff" position={[4, -1.5, 4]} scale={2.4} />
      </Environment>
    </>
  )
}
