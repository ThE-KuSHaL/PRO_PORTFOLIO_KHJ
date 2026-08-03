'use client';

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface SkillsBrain3DProps {
  activeCategory: string | null;
  hoveredCategory: string | null;
  onNodeClick: (category: string) => void;
  onNodeHover: (category: string | null) => void;
  categories: string[];
}

const LOBE_MAPPING: Record<string, { label: string, pos: THREE.Vector3, color: number }> = {
  'Languages': { label: 'Frontal Lobe', pos: new THREE.Vector3(-2.5, 2.0, 1.0), color: 0x06b6d4 },
  'AI / ML': { label: 'Prefrontal Cortex', pos: new THREE.Vector3(-3.8, -0.5, 1.5), color: 0x3b82f6 },
  'IoT & Hardware': { label: 'Motor Cortex', pos: new THREE.Vector3(0.0, 3.2, 0.5), color: 0x8b5cf6 },
  'Frameworks': { label: 'Parietal Lobe', pos: new THREE.Vector3(2.8, 2.0, 0.0), color: 0xec4899 },
  'Design & Tools': { label: 'Temporal Lobe', pos: new THREE.Vector3(-1.0, -1.0, 2.0), color: 0x14b8a6 },
  'Core CS': { label: 'Cerebellum', pos: new THREE.Vector3(3.2, -1.5, 0.5), color: 0xf59e0b },
  'Cloud / DevOps': { label: 'Brain Stem', pos: new THREE.Vector3(1.0, -3.5, 0.0), color: 0xef4444 },
};

const CONNECTIONS = [
  ['AI / ML', 'Languages'],
  ['Languages', 'IoT & Hardware'],
  ['IoT & Hardware', 'Frameworks'],
  ['Frameworks', 'Core CS'],
  ['Core CS', 'Cloud / DevOps'],
  ['Cloud / DevOps', 'IoT & Hardware'], // Central spine
  ['Design & Tools', 'AI / ML'],
  ['Design & Tools', 'IoT & Hardware'],
  ['Design & Tools', 'Core CS'],
  ['Design & Tools', 'Cloud / DevOps'],
];

export default function SkillsBrain3D({
  activeCategory,
  hoveredCategory,
  onNodeClick,
  onNodeHover,
  categories,
}: SkillsBrain3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const labelsContainerRef = useRef<HTMLDivElement>(null);

  const activeRef = useRef(activeCategory);
  const hoverRef = useRef(hoveredCategory);
  const onHoverRef = useRef(onNodeHover);
  const onClickRef = useRef(onNodeClick);

  useEffect(() => {
    activeRef.current = activeCategory;
    hoverRef.current = hoveredCategory;
    onHoverRef.current = onNodeHover;
    onClickRef.current = onNodeClick;
  }, [activeCategory, hoveredCategory, onNodeHover, onNodeClick]);

  useEffect(() => {
    if (!containerRef.current || !labelsContainerRef.current) return;

    // --- Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 12); // Pushed back slightly to fit the brain

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- Content ---
    const nodes: { cat: string, mesh: THREE.Group, color: number }[] = [];
    const hitMeshes: THREE.Mesh[] = [];

    // Create Nodes (Data Hubs)
    categories.forEach(cat => {
      const mapping = LOBE_MAPPING[cat];
      if (!mapping) return;

      const group = new THREE.Group();
      group.position.copy(mapping.pos);

      // Core Sphere
      const coreGeo = new THREE.IcosahedronGeometry(0.3, 2);
      const coreMat = new THREE.MeshBasicMaterial({
        color: mapping.color,
        transparent: true,
        opacity: 0.3,
        wireframe: true
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.name = "core";
      group.add(coreMesh);

      // Inner Solid Core
      const innerGeo = new THREE.SphereGeometry(0.15, 16, 16);
      const innerMat = new THREE.MeshBasicMaterial({ color: mapping.color, transparent: true, opacity: 0.8 });
      const innerMesh = new THREE.Mesh(innerGeo, innerMat);
      innerMesh.name = "inner";
      group.add(innerMesh);

      // Outer Ring
      const ringGeo = new THREE.TorusGeometry(0.5, 0.02, 16, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x475569, transparent: true, opacity: 0.5 });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.name = "ring";
      ringMesh.rotation.x = Math.PI / 2;
      group.add(ringMesh);

      // Halo Glow
      const glowGeo = new THREE.SphereGeometry(1.0, 32, 32);
      const glowMat = new THREE.MeshBasicMaterial({
        color: mapping.color,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      glowMesh.name = "glow";
      group.add(glowMesh);

      // Invisible Hitbox
      const hitGeo = new THREE.SphereGeometry(1.0, 16, 16);
      const hitMat = new THREE.MeshBasicMaterial({ visible: false });
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.userData = { id: cat };
      group.add(hitMesh);
      hitMeshes.push(hitMesh);

      scene.add(group);
      nodes.push({ cat, mesh: group, color: mapping.color });
    });

    // Create Neural Pathways (Splines)
    const curves: THREE.CatmullRomCurve3[] = [];
    const lineMaterials: THREE.LineBasicMaterial[] = [];

    CONNECTIONS.forEach(pair => {
      const start = LOBE_MAPPING[pair[0]]?.pos;
      const end = LOBE_MAPPING[pair[1]]?.pos;
      if (!start || !end) return;

      // Add a slight outward bulge to make it feel volumetric
      const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      const dist = start.distanceTo(end);
      midPoint.z += dist * 0.2;
      midPoint.y += (Math.random() - 0.5) * 0.5;

      const curve = new THREE.CatmullRomCurve3([start, midPoint, end]);
      curves.push(curve);

      const points = curve.getPoints(50);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x334155,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending
      });
      const line = new THREE.Line(lineGeo, lineMat);
      line.userData = { pair };
      scene.add(line);
      lineMaterials.push(lineMat);
    });

    // Particle System (Data Flowing)
    const particleCount = 40;
    const pGeo = new THREE.SphereGeometry(0.03, 8, 8);
    const pMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
    const pMesh = new THREE.InstancedMesh(pGeo, pMat, particleCount);
    scene.add(pMesh);

    const particlesData = Array.from({ length: particleCount }).map(() => ({
      curveIndex: Math.floor(Math.random() * curves.length),
      offset: Math.random(),
      speed: 0.001 + Math.random() * 0.002,
      direction: Math.random() > 0.5 ? 1 : -1
    }));

    // Ambient tech dust
    const ambientCount = 100;
    const ambientGeo = new THREE.BufferGeometry();
    const ambientPos = new Float32Array(ambientCount * 3);
    for (let i = 0; i < ambientCount * 3; i++) {
      ambientPos[i] = (Math.random() - 0.5) * 20;
    }
    ambientGeo.setAttribute('position', new THREE.BufferAttribute(ambientPos, 3));
    const ambientMat = new THREE.PointsMaterial({ color: 0x06b6d4, size: 0.02, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending });
    const ambientPoints = new THREE.Points(ambientGeo, ambientMat);
    scene.add(ambientPoints);

    // --- Interaction ---
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(0, 0);
    const targetMouse = new THREE.Vector2(0, 0);
    let currentHover: string | null = null;

    const onMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current!.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      targetMouse.set(x, y);

      raycaster.setFromCamera(targetMouse, camera);
      const intersects = raycaster.intersectObjects(hitMeshes, false);

      let foundHover: string | null = null;
      if (intersects.length > 0) {
        foundHover = intersects[0].object.userData.id;
      }

      if (foundHover !== currentHover) {
        currentHover = foundHover;
        onHoverRef.current(currentHover);
        containerRef.current!.style.cursor = currentHover ? 'pointer' : 'auto';
      }
    };

    const onClickEvent = () => {
      if (currentHover) onClickRef.current(currentHover);
    };

    containerRef.current.addEventListener('mousemove', onMouseMove);
    containerRef.current.addEventListener('click', onClickEvent);

    // --- Animation Loop ---
    let frameId: number;
    const dummy = new THREE.Object3D();
    const projVector = new THREE.Vector3();

    const animate = () => {
      frameId = requestAnimationFrame(animate);

      // Subtle parallax mapped to mouse, but restrained
      mouse.lerp(targetMouse, 0.05);
      camera.position.x = mouse.x * 1.5;
      camera.position.y = mouse.y * 1.5;
      camera.lookAt(0, 0, 0);

      const active = activeRef.current;
      const hovered = hoverRef.current;

      // Update Nodes
      nodes.forEach(({ cat, mesh, color }) => {
        const isActive = active === cat;
        const isHovered = hovered === cat && !isActive;

        // Floating animation
        mesh.position.y += Math.sin(Date.now() * 0.001 + mesh.position.x) * 0.002;

        const core = mesh.getObjectByName("core") as THREE.Mesh;
        const inner = mesh.getObjectByName("inner") as THREE.Mesh;
        const ring = mesh.getObjectByName("ring") as THREE.Mesh;
        const glow = mesh.getObjectByName("glow") as THREE.Mesh;

        // Scale
        const targetScale = isActive ? 1.4 : (isHovered ? 1.2 : 1.0);
        mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);

        // Rotation
        core.rotation.y += 0.01;
        core.rotation.x += 0.005;
        ring.rotation.z -= 0.02;

        // Opacity & Color
        if (core && core.material) {
          const mat = core.material as THREE.MeshBasicMaterial;
          mat.opacity += ((isActive ? 0.8 : (isHovered ? 0.5 : 0.3)) - mat.opacity) * 0.1;
          const tColor = new THREE.Color(isActive ? '#ffffff' : color);
          mat.color.lerp(tColor, 0.1);
        }
        if (inner && inner.material) {
          const mat = inner.material as THREE.MeshBasicMaterial;
          const tColor = new THREE.Color(isActive ? '#ffffff' : color);
          mat.color.lerp(tColor, 0.1);
        }
        if (ring && ring.material) {
          const mat = ring.material as THREE.MeshBasicMaterial;
          mat.color.lerp(new THREE.Color(isActive ? color : 0x475569), 0.1);
        }
        if (glow && glow.material) {
          const mat = glow.material as THREE.MeshBasicMaterial;
          mat.opacity += ((isActive ? 0.4 : (isHovered ? 0.15 : 0.0)) - mat.opacity) * 0.1;
        }

        // HTML Label Positioning
        projVector.copy(mesh.position);
        projVector.y -= 0.8; // Label below node
        projVector.project(camera);

        const x = (projVector.x * .5 + .5) * containerRef.current!.clientWidth;
        const y = (projVector.y * -.5 + .5) * containerRef.current!.clientHeight;

        const labelEl = document.getElementById(`brain-label-${cat}`);
        if (labelEl) {
          labelEl.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
          labelEl.style.opacity = (isActive || isHovered) ? '1' : '0.4';
          labelEl.style.color = (isActive || isHovered) ? '#ffffff' : 'rgba(255,255,255,0.6)';
        }
      });

      // Update Lines
      scene.children.forEach(child => {
        if (child instanceof THREE.Line && child.userData.pair) {
          const [a, b] = child.userData.pair;
          const isConnectedToActive = active === a || active === b;
          const isConnectedToHover = hovered === a || hovered === b;

          const mat = child.material as THREE.LineBasicMaterial;
          let targetOp = 0.1;
          if (isConnectedToActive) targetOp = 0.8;
          else if (isConnectedToHover) targetOp = 0.4;

          mat.opacity += (targetOp - mat.opacity) * 0.1;

          let targetColor = new THREE.Color(0x334155);
          if (isConnectedToActive) {
            const activeNode = nodes.find(n => n.cat === active);
            if (activeNode) targetColor = new THREE.Color(activeNode.color);
          } else if (isConnectedToHover) {
            const hoverNode = nodes.find(n => n.cat === hovered);
            if (hoverNode) targetColor = new THREE.Color(hoverNode.color);
          }
          mat.color.lerp(targetColor, 0.1);
        }
      });

      // Update Particles
      particlesData.forEach((p, i) => {
        p.offset += p.speed * p.direction;
        if (p.offset > 1) p.offset = 0;
        if (p.offset < 0) p.offset = 1;

        const curve = curves[p.curveIndex];
        if (curve) {
          const pos = curve.getPointAt(p.offset);
          dummy.position.copy(pos);

          // If active, speed up particles on connected lines
          const pair = CONNECTIONS[p.curveIndex];
          if (pair && (pair[0] === active || pair[1] === active)) {
            dummy.scale.set(1.5, 1.5, 1.5);
            p.speed = 0.005;
          } else {
            dummy.scale.set(1, 1, 1);
            p.speed = 0.0015;
          }

          dummy.updateMatrix();
          pMesh.setMatrixAt(i, dummy.matrix);
        }
      });
      pMesh.instanceMatrix.needsUpdate = true;

      ambientPoints.rotation.y += 0.0005;
      ambientPoints.rotation.x += 0.0002;

      renderer.render(scene, camera);
    };

    animate();

    const onResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      if (containerRef.current) {
        containerRef.current.removeEventListener('mousemove', onMouseMove);
        containerRef.current.removeEventListener('click', onClickEvent);
        if (rendererRef.current) {
          containerRef.current.removeChild(rendererRef.current.domElement);
          rendererRef.current.dispose();
        }
      }

      // Cleanup geometries
      nodes.forEach(({ mesh }) => {
        mesh.traverse(child => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            (child.material as THREE.Material).dispose();
          }
        });
      });
      curves.length = 0;
      lineMaterials.forEach(m => m.dispose());
      pGeo.dispose(); pMat.dispose();
      ambientGeo.dispose(); ambientMat.dispose();
    };
  }, [categories]);

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
      <div
        ref={containerRef}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}
      />
      <div
        ref={labelsContainerRef}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        {categories.map((cat) => {
          const mapping = LOBE_MAPPING[cat];
          if (!mapping) return null;

          const isLit = activeCategory === cat || hoveredCategory === cat;
          return (
            <div
              key={cat}
              id={`brain-label-${cat}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                willChange: 'transform',
                textAlign: 'center',
                transition: 'opacity 0.3s ease, color 0.3s ease',
              }}
            >
              <div style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: isLit ? '#ffffff' : 'rgba(255,255,255,0.7)',
                textShadow: isLit ? `0 0 10px ${mapping.color}` : '0 2px 4px rgba(0,0,0,0.8)',
                marginBottom: '4px',
                textTransform: 'uppercase'
              }}>
                {mapping.label}
              </div>
              <div style={{
                fontSize: '0.65rem',
                fontWeight: 600,
                color: isLit ? '#' + mapping.color.toString(16).padStart(6, '0') : 'rgba(255,255,255,0.4)',
                letterSpacing: '0.04em',
                fontFamily: 'monospace'
              }}>
                SYS::{cat.replace(' ', '_').toUpperCase()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { LOBE_MAPPING };
