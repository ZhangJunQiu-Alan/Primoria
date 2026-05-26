export const THREE_ORBIT_CONTROLS_SHIM = `
function installThreeOrbitControlsFallback() {
  var THREE = window.THREE;
  if (!THREE || THREE.OrbitControls) return;

  function OrbitControls(object, domElement) {
    this.object = object;
    this.domElement = domElement || document;
    this.enabled = true;
    this.target = new THREE.Vector3();
    this.enableDamping = false;
    this.dampingFactor = 0.05;
    this.rotateSpeed = 1;
    this.zoomSpeed = 1;
    this.minDistance = 0;
    this.maxDistance = Infinity;
    this.autoRotate = false;
    this.autoRotateSpeed = 2;

    var scope = this;
    var listeners = Object.create(null);
    var spherical = new THREE.Spherical();
    var offset = new THREE.Vector3();
    var dragging = false;
    var startX = 0;
    var startY = 0;

    function syncFromCamera() {
      offset.copy(scope.object.position).sub(scope.target);
      spherical.setFromVector3(offset);
      if (!isFinite(spherical.radius) || spherical.radius === 0) spherical.radius = 1;
    }

    function clampAndApply() {
      spherical.phi = Math.max(0.01, Math.min(Math.PI - 0.01, spherical.phi));
      spherical.radius = Math.max(scope.minDistance, Math.min(scope.maxDistance, spherical.radius));
      offset.setFromSpherical(spherical);
      scope.object.position.copy(scope.target).add(offset);
      if (typeof scope.object.lookAt === 'function') scope.object.lookAt(scope.target);
      scope.dispatchEvent({ type: 'change' });
    }

    function elementSize() {
      var rect = scope.domElement && scope.domElement.getBoundingClientRect ? scope.domElement.getBoundingClientRect() : null;
      return {
        width: Math.max(1, (rect && rect.width) || scope.domElement.clientWidth || window.innerWidth || 1),
        height: Math.max(1, (rect && rect.height) || scope.domElement.clientHeight || window.innerHeight || 1)
      };
    }

    function onPointerDown(event) {
      if (!scope.enabled) return;
      dragging = true;
      startX = event.clientX;
      startY = event.clientY;
      syncFromCamera();
      if (scope.domElement.setPointerCapture && event.pointerId != null) {
        try { scope.domElement.setPointerCapture(event.pointerId); } catch (_) {}
      }
      scope.dispatchEvent({ type: 'start' });
      if (event.preventDefault) event.preventDefault();
    }

    function onPointerMove(event) {
      if (!dragging || !scope.enabled) return;
      var size = elementSize();
      var dx = event.clientX - startX;
      var dy = event.clientY - startY;
      startX = event.clientX;
      startY = event.clientY;
      spherical.theta -= (2 * Math.PI * dx / size.width) * scope.rotateSpeed;
      spherical.phi -= (2 * Math.PI * dy / size.height) * scope.rotateSpeed;
      clampAndApply();
      if (event.preventDefault) event.preventDefault();
    }

    function onPointerUp(event) {
      if (!dragging) return;
      dragging = false;
      if (scope.domElement.releasePointerCapture && event.pointerId != null) {
        try { scope.domElement.releasePointerCapture(event.pointerId); } catch (_) {}
      }
      scope.dispatchEvent({ type: 'end' });
    }

    function onWheel(event) {
      if (!scope.enabled) return;
      syncFromCamera();
      var scale = Math.pow(0.95, scope.zoomSpeed);
      spherical.radius *= event.deltaY < 0 ? scale : 1 / scale;
      clampAndApply();
      if (event.preventDefault) event.preventDefault();
    }

    this.addEventListener = function(type, listener) {
      if (!listeners[type]) listeners[type] = [];
      if (listeners[type].indexOf(listener) === -1) listeners[type].push(listener);
    };
    this.removeEventListener = function(type, listener) {
      var list = listeners[type];
      if (!list) return;
      var index = list.indexOf(listener);
      if (index !== -1) list.splice(index, 1);
    };
    this.dispatchEvent = function(event) {
      var list = listeners[event.type];
      if (!list) return;
      list.slice().forEach(function(listener) { listener.call(scope, event); });
    };
    this.update = function() {
      syncFromCamera();
      if (this.autoRotate) spherical.theta -= (2 * Math.PI / 3600) * this.autoRotateSpeed;
      clampAndApply();
      return true;
    };
    this.dispose = function() {
      if (!scope.domElement || !scope.domElement.removeEventListener) return;
      scope.domElement.removeEventListener('pointerdown', onPointerDown);
      scope.domElement.removeEventListener('pointermove', onPointerMove);
      scope.domElement.removeEventListener('pointerup', onPointerUp);
      scope.domElement.removeEventListener('pointercancel', onPointerUp);
      scope.domElement.removeEventListener('wheel', onWheel);
    };
    this.reset = function() {
      syncFromCamera();
      clampAndApply();
    };

    syncFromCamera();
    if (this.domElement && this.domElement.addEventListener) {
      if (this.domElement.style) this.domElement.style.touchAction = 'none';
      this.domElement.addEventListener('pointerdown', onPointerDown);
      this.domElement.addEventListener('pointermove', onPointerMove);
      this.domElement.addEventListener('pointerup', onPointerUp);
      this.domElement.addEventListener('pointercancel', onPointerUp);
      this.domElement.addEventListener('wheel', onWheel, { passive: false });
    }
  }

  THREE.OrbitControls = OrbitControls;
}

window.__primoriaInstallThreeOrbitControls = installThreeOrbitControlsFallback;
installThreeOrbitControlsFallback();
`;
