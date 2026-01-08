import * as THREE from 'three';

export interface DragStateManagerOptions {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  camera: THREE.Camera;
  container: HTMLElement;
  controls: { enabled: boolean };
}

export class DragStateManager {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.Camera;
  private container: HTMLElement;
  private controls: { enabled: boolean };

  private mousePos: THREE.Vector2;
  private raycaster: THREE.Raycaster;
  private grabDistance: number;
  private active: boolean;
  private mouseDown: boolean;

  // Currently dragged object
  physicsObject: THREE.Object3D | null;

  // For force calculation
  localHit: THREE.Vector3;
  worldHit: THREE.Vector3;
  currentWorld: THREE.Vector3;
  offset: THREE.Vector3;

  // Debug arrow for force visualization
  private arrow: THREE.ArrowHelper;

  constructor(options: DragStateManagerOptions) {
    this.scene = options.scene;
    this.renderer = options.renderer;
    this.camera = options.camera;
    this.container = options.container;
    this.controls = options.controls;

    this.mousePos = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Line!.threshold = 0.1;

    this.grabDistance = 0.0;
    this.active = false;
    this.mouseDown = false;
    this.physicsObject = null;

    this.localHit = new THREE.Vector3();
    this.worldHit = new THREE.Vector3();
    this.currentWorld = new THREE.Vector3();
    this.offset = new THREE.Vector3();

    // Force vector visualization for debugging
    this.arrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 0),
      1,
      0x666666
    );
    this.arrow.setLength(1, 0.2, 0.1);
    const lineMaterial = Array.isArray(this.arrow.line.material)
      ? this.arrow.line.material[0]
      : this.arrow.line.material;
    const coneMaterial = Array.isArray(this.arrow.cone.material)
      ? this.arrow.cone.material[0]
      : this.arrow.cone.material;
    lineMaterial.transparent = true;
    coneMaterial.transparent = true;
    lineMaterial.opacity = 0.5;
    coneMaterial.opacity = 0.5;
    this.arrow.visible = false;
    this.scene.add(this.arrow);

    // Register event listeners
    this.container.addEventListener('pointerdown', this.onPointer, true);
    document.addEventListener('pointermove', this.onPointer, true);
    document.addEventListener('pointerup', this.onPointer, true);
  }

  private updateRaycaster(x: number, y: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mousePos.x = ((x - rect.left) / rect.width) * 2 - 1;
    this.mousePos.y = -((y - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mousePos, this.camera);
  }

  private start(x: number, y: number): void {
    this.physicsObject = null;
    this.updateRaycaster(x, y);

    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    for (const intersect of intersects) {
      const obj = intersect.object;
      // Only objects with bodyID > 0 are draggable (excludes world/plane)
      if ('bodyID' in obj && typeof obj.bodyID === 'number' && obj.bodyID > 0) {
        this.physicsObject = obj;
        this.grabDistance = intersect.distance;

        const hit = this.raycaster.ray.origin
          .clone()
          .addScaledVector(this.raycaster.ray.direction, this.grabDistance);

        this.localHit.copy(obj.worldToLocal(hit.clone()));
        this.worldHit.copy(hit);
        this.currentWorld.copy(hit);

        this.arrow.position.copy(hit);
        this.arrow.visible = true;

        this.active = true;
        this.controls.enabled = false; // Disable OrbitControls

        break;
      }
    }

    // If no object with bodyID is found, controls remain enabled
  }

  private move(x: number, y: number): void {
    if (!this.active) {
      return;
    }

    this.updateRaycaster(x, y);
    const hit = this.raycaster.ray.origin
      .clone()
      .addScaledVector(this.raycaster.ray.direction, this.grabDistance);

    this.currentWorld.copy(hit);
    this.update();
  }

  update(): void {
    if (!this.physicsObject || !this.active) {
      return;
    }

    // Recalculate world position of physicsObject
    this.worldHit.copy(this.localHit);
    this.physicsObject.localToWorld(this.worldHit);

    // Offset from target position (force direction and magnitude)
    this.offset.copy(this.currentWorld).sub(this.worldHit);

    // Update debug arrow
    this.arrow.position.copy(this.worldHit);
    if (this.offset.length() > 0.001) {
      this.arrow.setDirection(this.offset.clone().normalize());
      this.arrow.setLength(this.offset.length());
    }
  }

  end(): void {
    this.physicsObject = null;
    this.active = false;
    this.controls.enabled = true; // Re-enable OrbitControls
    this.arrow.visible = false;
    this.mouseDown = false;
  }

  private onPointer = (evt: PointerEvent): void => {
    if (evt.type === 'pointerdown') {
      this.start(evt.clientX, evt.clientY);
      this.mouseDown = true;
    } else if (evt.type === 'pointermove' && this.mouseDown) {
      this.move(evt.clientX, evt.clientY);
    } else if (evt.type === 'pointerup') {
      this.end();
    }
  };

  dispose(): void {
    this.container.removeEventListener('pointerdown', this.onPointer, true);
    document.removeEventListener('pointermove', this.onPointer, true);
    document.removeEventListener('pointerup', this.onPointer, true);

    if (this.arrow.parent) {
      this.scene.remove(this.arrow);
    }
    this.arrow.dispose?.();
  }
}
