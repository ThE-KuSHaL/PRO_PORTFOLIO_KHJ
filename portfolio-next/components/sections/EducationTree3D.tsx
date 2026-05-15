'use client';

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

type NodeId = '10th' | 'puc' | 'be';

interface EducationTree3DProps {
  activeNode: NodeId | null;
  hoveredNode: NodeId | null;
  onNodeClick: (id: NodeId) => void;
  onNodeHover: (id: NodeId | null) => void;
  nodesData: {
    id: NodeId;
    year: string;
    label: string;
    isBE: boolean;
  }[];
}

const POSITIONS: Record<NodeId, THREE.Vector3> = {
  '10th': new THREE.Vector3(5.5, -2.8, -2),
  'puc': new THREE.Vector3(4.5, 0.5, -1),
  'be': new THREE.Vector3(-1.0, 2.8, 1),
};

export default function EducationTree3D({
  activeNode,
  hoveredNode,
  onNodeClick,
  onNodeHover,
  nodesData,
}: EducationTree3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const labelsContainerRef = useRef<HTMLDivElement>(null);

  const activeNodeRef = useRef(activeNode);
  const hoveredNodeRef = useRef(hoveredNode);
  const onNodeHoverRef = useRef(onNodeHover);
  const onNodeClickRef = useRef(onNodeClick);

  useEffect(() => {
    activeNodeRef.current = activeNode;
    hoveredNodeRef.current = hoveredNode;
    onNodeHoverRef.current = onNodeHover;
    onNodeClickRef.current = onNodeClick;
  }, [activeNode, hoveredNode, onNodeHover, onNodeClick]);

  useEffect(() => {
    if (!containerRef.current || !labelsContainerRef.current) return;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- Content ---
    const curve = new THREE.CatmullRomCurve3([
      POSITIONS['10th'],
      new THREE.Vector3(5.2, -1.0, -1.5),
      POSITIONS['puc'],
      new THREE.Vector3(1.5, 2.0, 0),
      POSITIONS['be'],
    ]);

    // Trunk Line
    const points = curve.getPoints(150);
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending
    });
    const line = new THREE.Line(lineGeo, lineMat);
    scene.add(line);

    // Nodes (Hyper-detailed Bulbs)
    const nodeMeshes: { id: NodeId, mesh: THREE.Group, isBE: boolean }[] = [];

    nodesData.forEach(node => {
      const group = new THREE.Group();
      group.position.copy(POSITIONS[node.id]);

      // INVERT: Rotate by 180 degrees so they hang like fruits from a branch
      group.rotation.z = Math.PI;

      const color = node.isBE ? 0x06b6d4 : 0x818cf8;

      // 1. Outer Glass Layer
      const glassGeo = new THREE.SphereGeometry(node.isBE ? 0.35 : 0.25, 32, 32);
      const glassMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.15 });
      const glassMesh = new THREE.Mesh(glassGeo, glassMat);
      glassMesh.name = "glass";
      glassMesh.position.y = node.isBE ? 0.3 : 0.25;
      group.add(glassMesh);

      // 1.1 Inner Glass Layer (adds depth refraction)
      const innerGlassGeo = new THREE.SphereGeometry(node.isBE ? 0.30 : 0.20, 32, 32);
      const innerGlassMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.05 });
      const innerGlassMesh = new THREE.Mesh(innerGlassGeo, innerGlassMat);
      innerGlassMesh.name = "innerGlass";
      innerGlassMesh.position.y = glassMesh.position.y;
      group.add(innerGlassMesh);

      // 1.2 Structural Wireframe Cage (Sci-Fi detail)
      const cageGeo = new THREE.IcosahedronGeometry(node.isBE ? 0.36 : 0.26, 2);
      const cageMat = new THREE.MeshBasicMaterial({ color: 0x334155, wireframe: true, transparent: true, opacity: 0.15 });
      const cageMesh = new THREE.Mesh(cageGeo, cageMat);
      cageMesh.position.y = glassMesh.position.y;
      group.add(cageMesh);

      // 2. Complex Multi-part Filament Core
      const filamentGroup = new THREE.Group();
      filamentGroup.name = "filamentGroup";
      filamentGroup.position.y = glassMesh.position.y;

      const fMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.4 });

      // Central rod
      const fCoreGeo = new THREE.CylinderGeometry(0.015, 0.015, node.isBE ? 0.3 : 0.2, 8);
      const fCore = new THREE.Mesh(fCoreGeo, fMat);
      filamentGroup.add(fCore);

      // Glowing tip
      const fTipGeo = new THREE.SphereGeometry(0.035, 16, 16);
      const fTip = new THREE.Mesh(fTipGeo, fMat);
      fTip.position.y = node.isBE ? 0.15 : 0.1;
      filamentGroup.add(fTip);

      // Energy rings
      const ringCount = 3;
      for (let r = 0; r < ringCount; r++) {
        const ringGeo = new THREE.TorusGeometry(0.06, 0.005, 8, 16);
        const ring = new THREE.Mesh(ringGeo, fMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = -0.05 + (r * 0.05);
        filamentGroup.add(ring);
      }
      group.add(filamentGroup);

      // 3. Hyper-detailed Hardware Base
      const baseGroup = new THREE.Group();
      baseGroup.position.y = 0;
      const metalMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
      const threadMat = new THREE.MeshBasicMaterial({ color: 0x334155 });

      // Socket Ring connecting glass to base
      const socketRingGeo = new THREE.TorusGeometry(node.isBE ? 0.16 : 0.12, 0.02, 16, 32);
      const socketRing = new THREE.Mesh(socketRingGeo, metalMat);
      socketRing.rotation.x = Math.PI / 2;
      socketRing.position.y = 0.05;
      baseGroup.add(socketRing);

      // Main upper base body
      const baseMainGeo = new THREE.CylinderGeometry(node.isBE ? 0.16 : 0.12, node.isBE ? 0.16 : 0.12, 0.06, 32);
      const baseMain = new THREE.Mesh(baseMainGeo, metalMat);
      baseMain.position.y = 0.02;
      baseGroup.add(baseMain);

      // Realistic Screw Threads (4 loops)
      const threadCount = 4;
      const threadBaseY = -0.02;
      for (let t = 0; t < threadCount; t++) {
        const threadGeo = new THREE.TorusGeometry(node.isBE ? 0.14 : 0.10, 0.015, 16, 32);
        const thread = new THREE.Mesh(threadGeo, threadMat);
        thread.rotation.x = Math.PI / 2;
        thread.position.y = threadBaseY - (t * 0.022);
        baseGroup.add(thread);
      }

      // Bottom Contact Dome
      const contactGeo = new THREE.SphereGeometry(node.isBE ? 0.13 : 0.09, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      const contactMat = new THREE.MeshBasicMaterial({ color: 0x020617 }); // Pitch black insulator
      const contact = new THREE.Mesh(contactGeo, contactMat);
      contact.rotation.x = Math.PI; // Point down away from glass
      contact.position.y = threadBaseY - (threadCount * 0.022) + 0.01;
      baseGroup.add(contact);

      // Central silver contact pin
      const pinGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.03, 8);
      const pinMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
      const pin = new THREE.Mesh(pinGeo, pinMat);
      pin.position.y = contact.position.y - (node.isBE ? 0.12 : 0.08);
      baseGroup.add(pin);

      group.add(baseGroup);

      // 4. Rays (Lines coming out when active)
      const raysGroup = new THREE.Group();
      raysGroup.name = "rays";
      raysGroup.position.y = glassMesh.position.y;
      const rayCount = 12; // More rays!
      const rayLength = node.isBE ? 0.15 : 0.1;
      const rayDistance = node.isBE ? 0.45 : 0.35;

      for (let i = 0; i < rayCount; i++) {
        const angle = (i / rayCount) * Math.PI * 2;
        const rayGeo = new THREE.BoxGeometry(0.02, rayLength, 0.02);
        const rayMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0 });
        const ray = new THREE.Mesh(rayGeo, rayMat);

        ray.position.x = Math.cos(angle) * rayDistance;
        ray.position.y = Math.sin(angle) * rayDistance;
        ray.rotation.z = angle - Math.PI / 2;

        raysGroup.add(ray);
      }
      group.add(raysGroup);

      // 5. Glow (Halo)
      const glowGeo = new THREE.SphereGeometry(node.isBE ? 0.8 : 0.6, 32, 32);
      const glowMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      glowMesh.name = "glow";
      glowMesh.position.y = glassMesh.position.y;
      group.add(glowMesh);

      // Invisible Hitbox (reduced size for precise hover, proximity handles approach)
      const hitGeo = new THREE.SphereGeometry(0.8, 16, 16);
      const hitMat = new THREE.MeshBasicMaterial({ visible: false });
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.userData = { id: node.id };
      hitMesh.position.y = glassMesh.position.y;
      group.add(hitMesh);

      scene.add(group);
      nodeMeshes.push({ id: node.id as NodeId, mesh: group, isBE: node.isBE });
    });

    // Particles
    const particleCount = 12;
    const pGeo = new THREE.SphereGeometry(0.025, 8, 8);
    const pMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending });
    const pMesh = new THREE.InstancedMesh(pGeo, pMat, particleCount);
    scene.add(pMesh);

    const particlesData = Array.from({ length: particleCount }).map(() => ({
      offset: Math.random(),
      speed: 0.0005 + Math.random() * 0.001,
      jitter: Math.random() * 100
    }));

    // Ambient dust
    const ambientCount = 60;
    const ambientGeo = new THREE.BufferGeometry();
    const ambientPos = new Float32Array(ambientCount * 3);
    for (let i = 0; i < ambientCount * 3; i++) {
      ambientPos[i] = (Math.random() - 0.5) * 15;
    }
    ambientGeo.setAttribute('position', new THREE.BufferAttribute(ambientPos, 3));
    const ambientMat = new THREE.PointsMaterial({ color: 0x818cf8, size: 0.02, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending });
    const ambientPoints = new THREE.Points(ambientGeo, ambientMat);
    scene.add(ambientPoints);

    // --- Interaction ---
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(0, 0);
    const targetMouse = new THREE.Vector2(0, 0);
    let currentHover: NodeId | null = null;

    const onMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current!.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      targetMouse.set(x, y);

      raycaster.setFromCamera(targetMouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      let foundHover: NodeId | null = null;
      for (const intersect of intersects) {
        if (intersect.object.userData && intersect.object.userData.id) {
          foundHover = intersect.object.userData.id;
          break;
        }
      }

      if (foundHover !== currentHover) {
        currentHover = foundHover;
        onNodeHoverRef.current(currentHover);
        if (currentHover) {
          containerRef.current!.style.cursor = 'pointer';
        } else {
          containerRef.current!.style.cursor = 'auto';
        }
      }
    };

    const onClickEvent = () => {
      if (currentHover) {
        onNodeClickRef.current(currentHover);
      }
    };

    containerRef.current.addEventListener('mousemove', onMouseMove);
    containerRef.current.addEventListener('click', onClickEvent);

    // --- Animation Loop ---
    let frameId: number;
    const dummy = new THREE.Object3D();
    const projVector = new THREE.Vector3();

    const animate = () => {
      frameId = requestAnimationFrame(animate);

      mouse.lerp(targetMouse, 0.1);
      // Parallax removed so 3D elements stay perfectly locked to the 2D background image
      camera.lookAt(0, 0, 0);

      const active = activeNodeRef.current;
      const hovered = hoveredNodeRef.current;

      nodeMeshes.forEach(({ id, mesh, isBE }) => {
        const isActiveNode = active === id;
        const isHoveredNode = hovered === id && !isActiveNode;

        // Calculate Proximity to mouse (NDC space)
        const bulbCenter = new THREE.Vector3().copy(mesh.position);
        bulbCenter.project(camera);

        // Aspect ratio correction so distance feels uniform
        const aspect = containerRef.current!.clientWidth / containerRef.current!.clientHeight;
        const dx = (targetMouse.x - bulbCenter.x) * aspect;
        const dy = targetMouse.y - bulbCenter.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Proximity factor (0 to 1) starts taking effect when mouse is within ~0.6 units
        const proximityThreshold = 0.6;
        const proximity = Math.max(0, 1.0 - (dist / proximityThreshold));

        const isLit = isActiveNode || isHoveredNode || proximity > 0.4;

        // Dynamic scale based on proximity
        let targetScale = 1.0;
        if (isActiveNode) targetScale = 1.15;
        else if (isHoveredNode) targetScale = 1.1;
        else targetScale = 1.0 + (proximity * 0.05);
        mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);

        // 10th grade is firmly ROOTED, no floating animation. Others float gently.
        if (id === '10th') {
          mesh.position.y = POSITIONS[id].y;
        } else {
          mesh.position.y = POSITIONS[id].y + Math.sin(Date.now() * 0.0005 + POSITIONS[id].x) * 0.05;
        }

        const glass = mesh.getObjectByName("glass") as THREE.Mesh;
        const innerGlass = mesh.getObjectByName("innerGlass") as THREE.Mesh;
        const filamentGroup = mesh.getObjectByName("filamentGroup") as THREE.Group;
        const raysGroup = mesh.getObjectByName("rays") as THREE.Group;
        const glow = mesh.getObjectByName("glow") as THREE.Mesh;

        // Color transition logic
        let colorLerp = 0;
        if (isActiveNode) colorLerp = 1.0;
        else if (isHoveredNode) colorLerp = 0.6;
        else colorLerp = proximity * 0.5; // Starts turning white as you approach
        const baseColor = new THREE.Color(isBE ? 0x06b6d4 : 0x818cf8);
        const finalTargetColor = baseColor.clone().lerp(new THREE.Color('#ffffff'), colorLerp);

        // Animate Outer Glass
        if (glass && glass.material) {
          let targetOpacity = 0.15;
          if (isActiveNode) targetOpacity = 0.8;
          else if (isHoveredNode) targetOpacity = 0.45;
          else targetOpacity = 0.15 + (proximity * 0.25); // Glows as you approach!

          (glass.material as THREE.MeshBasicMaterial).opacity += (targetOpacity - (glass.material as THREE.MeshBasicMaterial).opacity) * 0.1;
          (glass.material as THREE.MeshBasicMaterial).color.lerp(finalTargetColor, 0.1);
        }

        // Animate Inner Glass
        if (innerGlass && innerGlass.material) {
          let targetOpacity = 0.05;
          if (isActiveNode) targetOpacity = 0.5;
          else if (isHoveredNode) targetOpacity = 0.2;
          else targetOpacity = 0.05 + (proximity * 0.1);

          (innerGlass.material as THREE.MeshBasicMaterial).opacity += (targetOpacity - (innerGlass.material as THREE.MeshBasicMaterial).opacity) * 0.1;
          (innerGlass.material as THREE.MeshBasicMaterial).color.lerp(finalTargetColor, 0.1);
        }

        // Animate Multi-part Filament
        if (filamentGroup) {
          let targetOpacity = 0.4;
          if (isActiveNode) targetOpacity = 1.0;
          else if (isHoveredNode) targetOpacity = 0.75;
          else targetOpacity = 0.4 + (proximity * 0.3);

          filamentGroup.children.forEach(child => {
            if (child instanceof THREE.Mesh) {
              const mat = child.material as THREE.MeshBasicMaterial;
              mat.opacity += (targetOpacity - mat.opacity) * 0.1;
              mat.color.lerp(finalTargetColor, 0.1);
            }
          });
        }

        // Animate Radial Rays
        if (raysGroup) {
          const targetRayOpacity = isActiveNode ? 1.0 : 0.0;
          raysGroup.children.forEach(ray => {
            const rMat = (ray as THREE.Mesh).material as THREE.MeshBasicMaterial;
            rMat.opacity += (targetRayOpacity - rMat.opacity) * 0.1;
            const targetColor = new THREE.Color(isActiveNode ? '#ffffff' : (isBE ? 0x06b6d4 : 0x818cf8));
            rMat.color.lerp(targetColor, 0.1);
          });
          raysGroup.rotation.z += 0.005;
        }

        // Animate Halo Glow
        if (glow && glow.material) {
          let targetHalo = 0.0;
          if (isActiveNode) targetHalo = 0.3;
          else if (isHoveredNode) targetHalo = 0.15;
          else targetHalo = proximity * 0.08;

          (glow.material as THREE.MeshBasicMaterial).opacity += (targetHalo - (glow.material as THREE.MeshBasicMaterial).opacity) * 0.1;
        }

        // HTML Label positioning
        projVector.copy(mesh.position);
        projVector.y -= isBE ? 1.0 : 0.8;
        projVector.project(camera);

        const x = (projVector.x * .5 + .5) * containerRef.current!.clientWidth;
        const y = (projVector.y * -.5 + .5) * containerRef.current!.clientHeight;

        const labelEl = document.getElementById(`3d-label-${id}`);
        if (labelEl) {
          labelEl.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
          labelEl.style.opacity = isLit ? '1' : '0.5';
          labelEl.style.color = isLit ? '#ffffff' : 'rgba(255,255,255,0.6)';
        }
      });

      // Update Particles
      particlesData.forEach((p, i) => {
        p.offset += p.speed;
        if (p.offset > 1) p.offset = 0;

        const pos = curve.getPointAt(p.offset);
        dummy.position.copy(pos);
        dummy.position.x += Math.sin(p.offset * 50 + p.jitter) * 0.05;
        dummy.position.y += Math.cos(p.offset * 40 + p.jitter) * 0.05;
        dummy.updateMatrix();
        pMesh.setMatrixAt(i, dummy.matrix);
      });
      pMesh.instanceMatrix.needsUpdate = true;

      ambientPoints.rotation.y += 0.0005;

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

      lineGeo.dispose(); lineMat.dispose();
      nodeMeshes.forEach(({ mesh }) => {
        // Deep traverse to dispose geometries and materials properly to avoid memory leaks with complex geometry
        mesh.traverse(child => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              (child.material as THREE.Material).dispose();
            }
          }
        });
      });
      pGeo.dispose(); pMat.dispose();
      ambientGeo.dispose(); ambientMat.dispose();
    };
  }, [nodesData]);

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
        {nodesData.map((node) => {
          const isBE = node.isBE;
          const color = isBE ? '#06b6d4' : '#818cf8';
          return (
            <div
              key={node.id}
              id={`3d-label-${node.id}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                willChange: 'transform',
                textAlign: 'center',
                transition: 'opacity 0.4s ease, color 0.4s ease',
              }}
            >
              <div style={{ fontSize: isBE ? '0.9rem' : '0.8rem', fontWeight: 600, letterSpacing: '0.04em', marginBottom: '4px', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                {node.label}
              </div>
              <div style={{ fontSize: isBE ? '0.65rem' : '0.55rem', fontWeight: 700, color: color, letterSpacing: '0.12em', opacity: 0.8, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                {node.year}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
