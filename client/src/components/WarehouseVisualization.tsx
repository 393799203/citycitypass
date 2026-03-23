import { useEffect, useRef, useState, memo, useMemo, lazy, Suspense } from 'react';
// @ts-ignore
import * as THREE from 'three';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

interface Location {
  id: string;
  level: number;
  position?: number;
}

interface Shelf {
  id: string;
  code: string;
  type: string;
  locations?: Location[];
}

interface Zone {
  id: string;
  code: string;
  name: string;
  type: string;
  shelves?: Shelf[];
}

interface WarehouseVisualizationProps {
  zones: Zone[];
  selectedShelfId?: string | null;
  showResetButton?: boolean;
  resetTrigger?: number;
}

const zoneColors: Record<string, number> = {
  RECEIVING: 0x3b82f6,
  STORAGE: 0x6b7280,
  PICKING: 0xeab308,
  SHIPPING: 0x22c55e,
  RETURNING: 0xef4444,
};

export default memo(function WarehouseVisualization({ zones, selectedShelfId, showResetButton, resetTrigger }: WarehouseVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const zoneGroupsRef = useRef<Map<string, THREE.Group>>(new Map());
  const [isZoomed, setIsZoomed] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const validZones = useMemo(() => zones.filter(z => z.shelves && z.shelves.length > 0), [zones]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (validZones.length === 0) return;

    const container = containerRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f4f8);

    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / (container.clientHeight || 550), 0.1, 1000);
    camera.position.set(0, 12, 18);

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight || 550);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.BasicShadowMap;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minPolarAngle = 0.1;
    controls.maxPolarAngle = Math.PI / 2 - 0.1;
    controls.target.set(0, 3, 0);
    controls.update();
    controlsRef.current = controls;
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(20, 40, 20);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 512;
    mainLight.shadow.mapSize.height = 512;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 100;
    mainLight.shadow.camera.left = -40;
    mainLight.shadow.camera.right = 40;
    mainLight.shadow.camera.top = 40;
    mainLight.shadow.camera.bottom = -40;
    scene.add(mainLight);

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight || 550;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    setIsLoaded(true);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      zoneGroupsRef.current.clear();
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current || !isLoaded) return;
    const scene = sceneRef.current;

    const zoneWidth = 8;
    const zoneDepth = 6;
    const zoneGap = 3;
    const shelfWidth = 2;
    const shelfDepth = 1.5;
    const levelHeight = 0.8;

    const existingZoneIds = new Set(zoneGroupsRef.current.keys());
    const newZoneIds = new Set(validZones.map(z => z.id));

    existingZoneIds.forEach(id => {
      if (!newZoneIds.has(id)) {
        const group = zoneGroupsRef.current.get(id);
        if (group) {
          scene.remove(group);
          zoneGroupsRef.current.delete(id);
        }
      }
    });

    let offsetX = -((validZones.length - 1) * (zoneWidth + zoneGap)) / 2;

    validZones.forEach((zone, zoneIndex) => {
      let zoneGroup = zoneGroupsRef.current.get(zone.id);

      if (!zoneGroup) {
        zoneGroup = new THREE.Group();
        zoneGroup.userData.zoneId = zone.id;

        const zoneColor = zoneColors[zone.type] || 0x6b7280;
        const zoneMaterial = new THREE.MeshStandardMaterial({
          color: zoneColor,
          transparent: true,
          opacity: 0.2,
          roughness: 0.8,
        });
        const zoneFloor = new THREE.Mesh(
          new THREE.BoxGeometry(zoneWidth, 0.1, zoneDepth),
          zoneMaterial
        );
        zoneFloor.position.set(0, 0.05, 0);
        zoneFloor.receiveShadow = true;
        zoneGroup.add(zoneFloor);

        const zoneBorder = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.BoxGeometry(zoneWidth, 0.2, zoneDepth)),
          new THREE.LineBasicMaterial({ color: zoneColor, linewidth: 2 })
        );
        zoneBorder.position.set(0, 0.1, 0);
        zoneGroup.add(zoneBorder);

        const zoneLabel = createTextSprite(zone.name, zoneColor);
        zoneLabel.position.set(0, 0.5, -zoneDepth / 2 - 0.5);
        zoneGroup.add(zoneLabel);

        scene.add(zoneGroup);
        zoneGroupsRef.current.set(zone.id, zoneGroup);
      }

      const zoneX = offsetX + zoneIndex * (zoneWidth + zoneGap);
      zoneGroup.position.set(zoneX, 0, 0);

      const shelves = zone.shelves || [];
      const shelfGap = shelfWidth * 0.6;

      while (zoneGroup.children.length > 3) {
        zoneGroup.remove(zoneGroup.children[3]);
      }

      shelves.forEach((shelf) => {
        const shelfGroup = new THREE.Group();
        shelfGroup.userData.shelfId = shelf.id;
        const locations = shelf.locations || [];
        const maxLevel = locations.length > 0 ? Math.max(...locations.map(l => l.level)) : 1;
        const totalHeight = maxLevel * levelHeight;
        const isSelected = shelf.id === selectedShelfId;

        const shelfColor = isSelected ? 0xf97316 : 0x1e3a5f;
        const shelfMaterial = new THREE.MeshStandardMaterial({
          color: shelfColor,
          roughness: 0.2,
          metalness: 0.8,
        });

        const leftCol = new THREE.Mesh(
          new THREE.BoxGeometry(0.15, totalHeight, shelfDepth),
          shelfMaterial
        );
        leftCol.position.set(-shelfWidth / 2, totalHeight / 2 + 0.1, 0);
        leftCol.castShadow = true;
        shelfGroup.add(leftCol);

        const rightCol = new THREE.Mesh(
          new THREE.BoxGeometry(0.15, totalHeight, shelfDepth),
          shelfMaterial
        );
        rightCol.position.set(shelfWidth / 2, totalHeight / 2 + 0.1, 0);
        rightCol.castShadow = true;
        shelfGroup.add(rightCol);

        const backCol = new THREE.Mesh(
          new THREE.BoxGeometry(shelfWidth, totalHeight, 0.1),
          shelfMaterial
        );
        backCol.position.set(0, totalHeight / 2 + 0.1, -shelfDepth / 2 + 0.05);
        backCol.castShadow = true;
        shelfGroup.add(backCol);

        locations.forEach((loc) => {
          const levelY = loc.level * levelHeight;

          const deck = new THREE.Mesh(
            new THREE.BoxGeometry(shelfWidth - 0.2, 0.06, shelfDepth - 0.2),
            new THREE.MeshStandardMaterial({
              color: isSelected ? 0xfbbf24 : 0x9ca3af,
              roughness: 0.5,
            })
          );
          deck.position.set(0, levelY, 0);
          deck.castShadow = true;
          deck.receiveShadow = true;
          shelfGroup.add(deck);

          if (loc.position !== null && loc.position !== undefined) {
            const posMarker = new THREE.Mesh(
              new THREE.BoxGeometry(0.15, 0.12, 0.15),
              new THREE.MeshStandardMaterial({
                color: 0x22c55e,
                roughness: 0.3,
              })
            );
            posMarker.position.set(
              -shelfWidth / 4 + (loc.position - 1) * 0.4,
              levelY + 0.1,
              0
            );
            shelfGroup.add(posMarker);
          }
        });

        if (isSelected) {
          const highlight = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.BoxGeometry(shelfWidth + 0.2, totalHeight + 0.3, shelfDepth + 0.2)),
            new THREE.LineBasicMaterial({ color: 0xf97316 })
          );
          highlight.position.set(0, totalHeight / 2 + 0.1, 0);
          shelfGroup.add(highlight);
        }

        const shelfLabel = createTextSprite(shelf.code, shelfColor);
        shelfLabel.position.set(0, totalHeight + 0.5, 0);
        shelfLabel.scale.set(2, 1, 1);
        shelfGroup.add(shelfLabel);

        const shelfIndex = shelves.indexOf(shelf);
        const shelfOffsetX = -(shelves.length - 1) * shelfGap / 2 + shelfIndex * shelfGap;
        shelfGroup.position.set(shelfOffsetX, 0.1, 0);
        zoneGroup.add(shelfGroup);
      });
    });
  }, [validZones, selectedShelfId, isLoaded]);

  useEffect(() => {
    if (selectedShelfId && cameraRef.current && controlsRef.current && sceneRef.current) {
      let targetShelf: THREE.Object3D | null = null;
      sceneRef.current.traverse((obj) => {
        if ((obj as any).userData?.shelfId === selectedShelfId) {
          targetShelf = obj;
        }
      });
      if (targetShelf) {
        const box = new THREE.Box3().setFromObject(targetShelf);
        const center = box.getCenter(new THREE.Vector3());
        controlsRef.current.target.copy(center);
        setIsZoomed(true);
      }
    }
  }, [selectedShelfId]);

  const handleReset = () => {
    if (cameraRef.current && controlsRef.current) {
      controlsRef.current.target.set(0, 3, 0);
      cameraRef.current.position.set(0, 12, 18);
      controlsRef.current.update();
      setIsZoomed(false);
    }
  };

  if (validZones.length === 0) {
    return (
      <div className="flex items-center justify-center h-[550px] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">📦</div>
          <div>暂无货架数据</div>
          <div className="text-sm">请先添加库区和货架</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={containerRef} className="w-full h-[550px] rounded-lg overflow-hidden" />
      {showResetButton && isZoomed && (
        <button
          onClick={handleReset}
          className="absolute bottom-4 right-4 px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 text-sm rounded-lg shadow-lg flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          全局
        </button>
      )}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur rounded-lg p-3 shadow text-xs">
        <div className="font-medium mb-2">图例</div>
        {Object.entries({
          RECEIVING: { label: '收货区', color: 'bg-blue-500' },
          STORAGE: { label: '存储区', color: 'bg-gray-500' },
          PICKING: { label: '拣货区', color: 'bg-yellow-500' },
          SHIPPING: { label: '发货区', color: 'bg-green-500' },
          RETURNING: { label: '退货区', color: 'bg-red-500' },
        }).map(([key, val]) => (
          <div key={key} className="flex items-center gap-2 mb-1">
            <div className={`w-3 h-3 rounded ${val.color}`} />
            <span>{val.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

function createTextSprite(text: string, color: number): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = 128;
  canvas.height = 64;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = 'bold 28px Arial';
  ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2, 1, 1);
  return sprite;
}
