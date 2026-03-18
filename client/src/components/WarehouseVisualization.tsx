import { useEffect, useRef, useMemo, useState } from 'react';
// @ts-ignore
import * as THREE from 'three';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

interface Shelf {
  id: string;
  code: string;
  type: string;
  row: number;
  column: number;
  level: number;
}

interface WarehouseVisualizationProps {
  shelves: Shelf[];
  selectedShelfId?: string | null;
  showResetButton?: boolean;
  resetTrigger?: number;
}

export default function WarehouseVisualization({ shelves, selectedShelfId, showResetButton, resetTrigger }: WarehouseVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const prevSelectedShelfIdRef = useRef<string | null | undefined>(null);

  const shelfStats = useMemo(() => {
    if (shelves.length === 0) return { maxRow: 1, maxColumn: 1, maxLevel: 1 };
    const maxRow = Math.max(...shelves.map(s => s.row));
    const maxColumn = Math.max(...shelves.map(s => s.column));
    const maxLevel = Math.max(...shelves.map(s => s.level));
    return { maxRow, maxColumn, maxLevel };
  }, [shelves]);

  useEffect(() => {
    if (!containerRef.current || shelves.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 550;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f4f8);

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minPolarAngle = 0.1;
    controls.maxPolarAngle = Math.PI / 2 - 0.1;
    controlsRef.current = controls;
    sceneRef.current = scene;
    cameraRef.current = camera;
    
    controls.target.set(0, 3, 0);
    camera.position.set(0, 12, 18);
    controls.update();

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(20, 30, 20);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 100;
    mainLight.shadow.camera.left = -30;
    mainLight.shadow.camera.right = 30;
    mainLight.shadow.camera.top = 30;
    mainLight.shadow.camera.bottom = -30;
    mainLight.shadow.bias = -0.0001;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3);
    fillLight.position.set(-15, 10, -15);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff8844, 0.2);
    rimLight.position.set(10, 5, -20);
    scene.add(rimLight);

    const floorSize = Math.max(shelfStats.maxColumn, shelfStats.maxRow) * 4 + 4;
    const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 0);
    scene.add(floor);

    const unitWidth = 3;
    const unitDepth = 2.5;
    const levelHeight = 1.2;
    const rowGap = 5;
    const colGap = 0.3;

    const rows = new Map<number, Shelf[]>();
    shelves.forEach(shelf => {
      if (!rows.has(shelf.row)) {
        rows.set(shelf.row, []);
      }
      rows.get(shelf.row)!.push(shelf);
    });

    rows.forEach((rowShelves, rowNum) => {
      const maxCol = Math.max(...rowShelves.map(s => s.column));
      const maxLevel = Math.max(...rowShelves.map(s => s.level));
      
      const rowType = rowShelves[0]?.type;
      const isHeavy = String(rowType) === '1';
      const beamColor = isHeavy ? 0x1e40af : 0xea580c;
      
      const offsetX = -((shelfStats.maxColumn - 1) * (unitWidth + colGap)) / 2;
      const rowZ = (rowNum - 1) * rowGap - ((shelfStats.maxRow - 1) * rowGap) / 2;

      const cabinetGroup = new THREE.Group();
      cabinetGroup.position.set(offsetX, 0, rowZ);

      const columnColor = 0x374151;
      const columnMaterial = new THREE.MeshStandardMaterial({ 
        color: columnColor,
        roughness: 0.3,
        metalness: 0.7
      });

      const beamMaterial = new THREE.MeshStandardMaterial({ 
        color: beamColor,
        roughness: 0.3,
        metalness: 0.5
      });

      const deckMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x9ca3af,
        roughness: 0.4,
        metalness: 0.5
      });

      const totalHeight = maxLevel * levelHeight;
      
      for (let col = 1; col <= maxCol; col++) {
        const shelf = rowShelves.find(s => s.column === col);
        if (!shelf) continue;

        const xPos = col * (unitWidth + colGap) - colGap;
        const levelCount = shelf.level;
        
        const columnWidth = 0.25;
        const columnDepth = 0.15;
        
        const frontLeftCol = new THREE.Mesh(
          new THREE.BoxGeometry(columnWidth, totalHeight, columnDepth),
          columnMaterial
        );
        frontLeftCol.position.set(xPos - unitWidth / 2, totalHeight / 2, unitDepth / 2);
        cabinetGroup.add(frontLeftCol);

        const frontRightCol = new THREE.Mesh(
          new THREE.BoxGeometry(columnWidth, totalHeight, columnDepth),
          columnMaterial
        );
        frontRightCol.position.set(xPos + unitWidth / 2, totalHeight / 2, unitDepth / 2);
        cabinetGroup.add(frontRightCol);

        const backLeftCol = new THREE.Mesh(
          new THREE.BoxGeometry(columnWidth, totalHeight, columnDepth),
          columnMaterial
        );
        backLeftCol.position.set(xPos - unitWidth / 2, totalHeight / 2, -unitDepth / 2);
        cabinetGroup.add(backLeftCol);

        const backRightCol = new THREE.Mesh(
          new THREE.BoxGeometry(columnWidth, totalHeight, columnDepth),
          columnMaterial
        );
        backRightCol.position.set(xPos + unitWidth / 2, totalHeight / 2, -unitDepth / 2);
        cabinetGroup.add(backRightCol);

        for (let l = 0; l < totalHeight / levelHeight; l++) {
          const braceY = l * levelHeight;
          
          const hBrace = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, levelHeight - 0.1, 0.02),
            columnMaterial
          );
          hBrace.position.set(xPos - unitWidth / 2 + columnWidth / 2, braceY + levelHeight / 2, -unitDepth / 2 + columnDepth / 2);
          cabinetGroup.add(hBrace);

          const hBrace2 = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, levelHeight - 0.1, 0.02),
            columnMaterial
          );
          hBrace2.position.set(xPos + unitWidth / 2 - columnWidth / 2, braceY + levelHeight / 2, -unitDepth / 2 + columnDepth / 2);
          cabinetGroup.add(hBrace2);
        }

        for (let level = 1; level <= levelCount; level++) {
          const levelY = level * levelHeight;

          const frontBeam = new THREE.Mesh(
            new THREE.BoxGeometry(unitWidth - 0.05, 0.1, 0.05),
            beamMaterial
          );
          frontBeam.position.set(xPos, levelY - 0.05, unitDepth / 2 - 0.02);
          cabinetGroup.add(frontBeam);

          const backBeam = new THREE.Mesh(
            new THREE.BoxGeometry(unitWidth - 0.05, 0.1, 0.05),
            beamMaterial
          );
          backBeam.position.set(xPos, levelY - 0.05, -unitDepth / 2 + 0.02);
          cabinetGroup.add(backBeam);

          const deckPlate = new THREE.Mesh(
            new THREE.BoxGeometry(unitWidth - 0.15, 0.04, unitDepth - 0.1),
            deckMaterial
          );
          deckPlate.position.set(xPos, levelY - 0.08, 0);
          cabinetGroup.add(deckPlate);

          for (let i = 0; i < 3; i++) {
            const deckWire = new THREE.Mesh(
              new THREE.BoxGeometry(unitWidth - 0.2, 0.015, 0.015),
              columnMaterial
            );
            deckWire.position.set(xPos, levelY - 0.05, -unitDepth / 3 + i * (unitDepth / 3));
            cabinetGroup.add(deckWire);
          }
        }

        if (shelf.id === selectedShelfId) {
          const outlineMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFD700,
            side: THREE.BackSide,
            transparent: true,
            opacity: 0.8
          });
          const outlineGeometry = new THREE.BoxGeometry(unitWidth + 0.1, totalHeight + 0.1, unitDepth + 0.1);
          const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
          outline.position.set(xPos, totalHeight / 2, 0);
          cabinetGroup.add(outline);
        }
      }

      scene.add(cabinetGroup);
    });

    const animate = () => {
      const id = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
      (window as any).vizAnimationId = id;
    };
    animate();

    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight || 550;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame((window as any).vizAnimationId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [shelves, shelfStats, selectedShelfId]);

  useEffect(() => {
    if (!selectedShelfId || !controlsRef.current || !cameraRef.current || shelves.length === 0) return;

    const shelf = shelves.find(s => s.id === selectedShelfId);
    if (!shelf) return;

    const offsetX = -((shelfStats.maxColumn - 1) * 4) / 2;
    const offsetZ = -((shelfStats.maxRow - 1) * 5) / 2;
    
    const targetX = ((shelf.column - 1) * 4) + offsetX;
    const targetZ = ((shelf.row - 1) * 5) + offsetZ;
    const targetY = shelf.level * 0.9 / 2;

    const controls = controlsRef.current;
    const camera = cameraRef.current;

    const startTarget = { x: controls.target.x, y: controls.target.y, z: controls.target.z };
    const endTarget = { x: targetX + 1.5, y: targetY, z: targetZ };
    
    const startPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
    const endPos = { x: targetX + 1, y: targetY + 3, z: targetZ + 4 };

    const duration = 800;
    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      controls.target.x = startTarget.x + (endTarget.x - startTarget.x) * eased;
      controls.target.y = startTarget.y + (endTarget.y - startTarget.y) * eased;
      controls.target.z = startTarget.z + (endTarget.z - startTarget.z) * eased;

      camera.position.x = startPos.x + (endPos.x - startPos.x) * eased;
      camera.position.y = startPos.y + (endPos.y - startPos.y) * eased;
      camera.position.z = startPos.z + (endPos.z - startPos.z) * eased;

      controls.update();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
    setIsZoomed(true);
  }, [selectedShelfId, shelves, resetTrigger]);

  useEffect(() => {
    const prev = prevSelectedShelfIdRef.current;
    if (prev !== null && prev !== undefined && (selectedShelfId === null || selectedShelfId === undefined)) {
      if (!controlsRef.current || !cameraRef.current || shelves.length === 0) return;
      
      const controls = controlsRef.current;
      const camera = cameraRef.current;
      
      const startTarget = { x: controls.target.x, y: controls.target.y, z: controls.target.z };
      const endTarget = { x: 0, y: 3, z: 0 };
      
      const startPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
      const endPos = { x: 0, y: 12, z: 18 };
      
      const duration = 800;
      const startTime = performance.now();
      
      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        
        controls.target.x = startTarget.x + (endTarget.x - startTarget.x) * eased;
        controls.target.y = startTarget.y + (endTarget.y - startTarget.y) * eased;
        controls.target.z = startTarget.z + (endTarget.z - startTarget.z) * eased;
        
        camera.position.x = startPos.x + (endPos.x - startPos.x) * eased;
        camera.position.y = startPos.y + (endPos.y - startPos.y) * eased;
        camera.position.z = startPos.z + (endPos.z - startPos.z) * eased;
        
        controls.update();
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      animate();
      setIsZoomed(false);
    }
    prevSelectedShelfIdRef.current = selectedShelfId ?? null;
  }, [selectedShelfId, shelves, resetTrigger]);
  
  useEffect(() => {
    if (selectedShelfId !== null || !controlsRef.current || !cameraRef.current || shelves.length === 0) return;

    const controls = controlsRef.current;
    const camera = cameraRef.current;

    const startTarget = { x: controls.target.x, y: controls.target.y, z: controls.target.z };
    const endTarget = { x: 0, y: 3, z: 0 };
    
    const startPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
    const endPos = { x: 0, y: 12, z: 18 };

    const duration = 800;
    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      controls.target.x = startTarget.x + (endTarget.x - startTarget.x) * eased;
      controls.target.y = startTarget.y + (endTarget.y - startTarget.y) * eased;
      controls.target.z = startTarget.z + (endTarget.z - startTarget.z) * eased;

      camera.position.x = startPos.x + (endPos.x - startPos.x) * eased;
      camera.position.y = startPos.y + (endPos.y - startPos.y) * eased;
      camera.position.z = startPos.z + (endPos.z - startPos.z) * eased;

      controls.update();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsZoomed(false);
      }
    };

    animate();
  }, [selectedShelfId, shelves, resetTrigger]);

  const resetToOverview = () => {
    if (!controlsRef.current || !cameraRef.current || shelves.length === 0) return;

    const controls = controlsRef.current;
    const camera = cameraRef.current;

    const startTarget = { x: controls.target.x, y: controls.target.y, z: controls.target.z };
    const endTarget = { x: 0, y: 3, z: 0 };
    
    const startPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
    const endPos = { x: 0, y: 12, z: 18 };

    const duration = 800;
    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      controls.target.x = startTarget.x + (endTarget.x - startTarget.x) * eased;
      controls.target.y = startTarget.y + (endTarget.y - startTarget.y) * eased;
      controls.target.z = startTarget.z + (endTarget.z - startTarget.z) * eased;

      camera.position.x = startPos.x + (endPos.x - startPos.x) * eased;
      camera.position.y = startPos.y + (endPos.y - startPos.y) * eased;
      camera.position.z = startPos.z + (endPos.z - startPos.z) * eased;

      controls.update();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
    setIsZoomed(false);
  };

  if (shelves.length === 0) {
    return (
      <div className="h-[550px] flex items-center justify-center text-gray-400 text-sm">
        暂无货架数据
      </div>
    );
  }

  return (
    <div className="h-[550px] rounded-lg overflow-hidden">
      {showResetButton && isZoomed && (
        <button
          onClick={resetToOverview}
          className="absolute top-3 right-3 z-10 px-3 py-1.5 bg-white/90 hover:bg-white text-gray-700 text-sm rounded-lg shadow-md flex items-center gap-1.5 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          全局
        </button>
      )}
      <div 
        ref={containerRef} 
        className="h-full w-full"
      />
    </div>
  );
}
