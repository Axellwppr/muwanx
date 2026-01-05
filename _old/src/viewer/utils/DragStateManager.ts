import * as THREE from 'three';
import { Vector3 } from 'three';

export class DragStateManager {
  scene: any;
  renderer: any;
  camera: any;
  mousePos: THREE.Vector2;
  raycaster: THREE.Raycaster;
  grabDistance: number;
  active: boolean;
  physicsObject: any;
  controls: any;
  arrow: THREE.ArrowHelper;
  previouslySelected: any;
  highlightColor: number;
  localHit: Vector3;
  worldHit: Vector3;
  currentWorld: Vector3;
  offset: Vector3;
  mouseDown: boolean;
  doubleClick: boolean;

  constructor(
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    camera: THREE.Camera,
    container: HTMLElement,
    controls: { enabled: boolean }
  ) {
    this.scene = scene;
    this.renderer = renderer;
    this.camera = camera;
    this.mousePos = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    //this.raycaster.layers.set(1);
    //					this.raycaster.params.Mesh.threshold = 3;
    this.raycaster.params.Line.threshold = 0.1;
    this.grabDistance = 0.0;
    this.active = false;
    this.physicsObject = null;
    this.controls = controls;

    this.arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 15, 0x666666);
    this.arrow.setLength(15, 3, 1);
    this.scene.add(this.arrow);
    //this.residuals.push(arrow);
    const lineMaterial = Array.isArray(this.arrow.line.material) ? this.arrow.line.material[0] : this.arrow.line.material;
    const coneMaterial = Array.isArray(this.arrow.cone.material) ? this.arrow.cone.material[0] : this.arrow.cone.material;
    lineMaterial.transparent = true;
    coneMaterial.transparent = true;
    lineMaterial.opacity = 0.5;
    coneMaterial.opacity = 0.5;
    this.arrow.visible = false;

    this.previouslySelected = null;
    this.highlightColor = 0xff0000;  // 0x777777

    this.localHit = new Vector3();
    this.worldHit = new Vector3();
    this.currentWorld = new Vector3();
    this.offset = new Vector3();
    this.mouseDown = false;
    this.doubleClick = false;

    container.addEventListener('pointerdown', this.onPointer.bind(this), true);
    document.addEventListener('pointermove', this.onPointer.bind(this), true);
    document.addEventListener('pointerup', this.onPointer.bind(this), true);
    document.addEventListener('pointerout', this.onPointer.bind(this), true);
    container.addEventListener('dblclick', this.onPointer.bind(this), false);
  }
  updateRaycaster(x: number, y: number): void {
    var rect = this.renderer.domElement.getBoundingClientRect();
    this.mousePos.x = ((x - rect.left) / rect.width) * 2 - 1;
    this.mousePos.y = -((y - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mousePos, this.camera);
  }
  start(x: number, y: number): void {
    this.physicsObject = null;
    this.updateRaycaster(x, y);
    let intersects = this.raycaster.intersectObjects(this.scene.children);
    for (let i = 0; i < intersects.length; i++) {
      let obj = intersects[i].object;
      if (obj.bodyID) {
        this.physicsObject = obj;
        this.grabDistance = intersects[0].distance;
        let hit = this.raycaster.ray.origin.clone();
        hit.addScaledVector(this.raycaster.ray.direction, this.grabDistance);
        this.arrow.position.copy(hit);
        //this.physicsObject.startGrab(hit);
        this.active = true;
        this.controls.enabled = false;
        this.localHit = obj.worldToLocal(hit.clone());
        this.worldHit.copy(hit);
        this.currentWorld.copy(hit);
        this.arrow.visible = true;
        break;
      }
    }
  }
  move(x: number, y: number): void {
    if (this.active) {
      this.updateRaycaster(x, y);
      let hit = this.raycaster.ray.origin.clone();
      hit.addScaledVector(this.raycaster.ray.direction, this.grabDistance);
      this.currentWorld.copy(hit);

      this.update();

      if (this.physicsObject != null) {
        //this.physicsObject.moveGrabbed(hit);
      }
    }
  }
  update() {
    if (this.worldHit && this.localHit && this.currentWorld && this.arrow && this.physicsObject) {
      this.worldHit.copy(this.localHit);
      this.physicsObject.localToWorld(this.worldHit);
      this.arrow.position.copy(this.worldHit);
      this.offset = this.currentWorld.clone().sub(this.worldHit);
      this.arrow.setDirection(this.offset.clone().normalize());
      this.arrow.setLength(this.offset.clone().length());
    }
  }
  end(evt?: PointerEvent | { type: string }): void {
    //this.physicsObject.endGrab();
    this.physicsObject = null;

    this.active = false;
    this.controls.enabled = true;
    //this.controls.onPointerUp(evt);
    this.arrow.visible = false;
    this.mouseDown = false;
  }
  onPointer(evt: PointerEvent | MouseEvent): void {
    if (evt.type == "pointerdown") {
      this.start(evt.clientX, evt.clientY);
      this.mouseDown = true;
    } else if (evt.type == "pointermove" && this.mouseDown) {
      if (this.active) { this.move(evt.clientX, evt.clientY); }
    } else if (evt.type == "pointerup" /*|| evt.type == "pointerout"*/) {
      this.end(evt as PointerEvent);
    }
    if (evt.type == "dblclick") {
      this.start(evt.clientX, evt.clientY);
      this.doubleClick = true;
      if (this.physicsObject) {
        if (this.physicsObject == this.previouslySelected) {
          this.physicsObject.material.emissive.setHex(0x000000);
          this.previouslySelected = null;
        } else {
          if (this.previouslySelected) {
            this.previouslySelected.material.emissive.setHex(0x000000);
          }
          this.physicsObject.material.emissive.setHex(this.highlightColor);
          this.previouslySelected = this.physicsObject;
        }
      } else {
        if (this.previouslySelected) {
          this.previouslySelected.material.emissive.setHex(0x000000);
          this.previouslySelected = null;
        }
      }
    }
  }
}
