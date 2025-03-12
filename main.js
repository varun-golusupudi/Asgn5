// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true;

// Orbit Controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minPolarAngle = 0; // Prevent camera from going below the ground
controls.maxPolarAngle = Math.PI / 2; // Limit to horizon

// Camera position (ensure starting above the ground)
camera.position.set(0, 20, 20);
camera.lookAt(0, 0, 0);

// Function to clear the scene
function clearScene() {
    while (scene.children.length > 0) {
        const object = scene.children[0];
        scene.remove(object);
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(mat => mat.dispose());
            } else {
                object.material.dispose();
            }
        }
    }
}

// Clear the scene before adding new objects
clearScene();

// Lights (Requirement: Three different types)
const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
scene.add(directionalLight);

const pointLight = new THREE.PointLight(0xff0000, 1, 100);
pointLight.position.set(-10, 10, -10);
pointLight.castShadow = true;
scene.add(pointLight);

// Declare textureLoader once at the top
const textureLoader = new THREE.TextureLoader();

// Ground plane (rotated to align with skybox)
const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xaaaaaa,
    side: THREE.DoubleSide // Make sure the ground is visible from both sides
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2; // This makes it horizontal
ground.receiveShadow = true;
scene.add(ground);

// Skybox using environment map directly on the scene
function createSkybox() {
    const loader = new THREE.CubeTextureLoader();
    loader.setPath('textures/');
    
    const textureCube = loader.load([
        'px.png', 'nx.png',  // positive x, negative x
        'py.png', 'ny.png',  // positive y, negative y
        'pz.png', 'nz.png'   // positive z, negative z
    ], 
    () => console.log('Skybox textures loaded successfully'));
    
    scene.background = textureCube;
}

// Initialize skybox
createSkybox();

// Add 20 primary shapes (Requirement)
const shapes = [];
for (let i = 0; i < 20; i++) {
    let geometry;
    const rand = Math.random();
    if (rand < 0.33) geometry = new THREE.BoxGeometry(5, 5, 5);
    else if (rand < 0.66) geometry = new THREE.SphereGeometry(2.5, 32, 32);
    else geometry = new THREE.CylinderGeometry(2.5, 2.5, 5, 32);

    const material = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff });
    const shape = new THREE.Mesh(geometry, material);
    shape.position.set((Math.random() - 0.5) * 50, Math.random() * 10 + 2, (Math.random() - 0.5) * 50);
    shape.castShadow = true;
    shape.receiveShadow = true;
    scene.add(shape);
    shapes.push(shape);
}

// Textured shape (Requirement: At least one textured shape)
const brickTexture = textureLoader.load('textures/brick.jpg', () => console.log('Brick texture loaded'), undefined, (error) => console.error('Brick texture error:', error));
const texturedCube = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2, 2),
    new THREE.MeshStandardMaterial({ map: brickTexture })
);
texturedCube.position.set(5, 1, 5);
texturedCube.castShadow = true;
scene.add(texturedCube);

// Second textured shape (Additional textured model)
const secondTexturedCube = new THREE.Mesh(
    new THREE.BoxGeometry(3, 3, 3), // Slightly larger to differentiate
    new THREE.MeshStandardMaterial({ map: brickTexture })
);
secondTexturedCube.position.set(10, 1.5, 10);
secondTexturedCube.castShadow = true;
scene.add(secondTexturedCube);

// Animated shape (Requirement: At least one animated shape)
const animatedSphere = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0x00ff00 })
);
animatedSphere.position.set(-5, 2, -5);
animatedSphere.castShadow = true;
scene.add(animatedSphere);

// Load crate.glb model (Additional model)
const gltfLoader = new THREE.GLTFLoader();
gltfLoader.load(
    'models/crate.glb',
    (gltf) => {
        const crate = gltf.scene;
        crate.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        crate.position.set(-10, 0, -10); // Position the crate
        crate.scale.set(1, 1, 1); // Adjust scale
        scene.add(crate);
    },
    (xhr) => console.log((xhr.loaded / xhr.total * 100) + '% crate loaded'),
    (error) => console.error('Crate GLTF error:', error)
);

// Load bird.obj model with bird.mtl materials (Additional model)
const mtlLoader = new THREE.MTLLoader();
mtlLoader.load(
    'models/bird.mtl',
    (materials) => {
        materials.preload();
        const objLoader = new THREE.OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.load(
            'models/bird.obj',
            (object) => {
                object.traverse(child => {
                    if (child.isMesh) {
                        // Ensure the material has a fallback color if the texture fails to load
                        if (child.material && !child.material.map) {
                            child.material.color.set(0x00ff00); // Fallback to green if no texture
                        }
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                // Compute the bounding box to adjust position
                const box = new THREE.Box3().setFromObject(object);
                const size = new THREE.Vector3();
                box.getSize(size);
                const center = new THREE.Vector3();
                box.getCenter(center);

                object.position.set(15, box.max.y, 15);
                object.position.y -= size.y / 2; 
                object.rotation.x = Math.PI / 2; 
                object.rotation.y = Math.PI;
                object.scale.set(2, 2, 2); // Keep the bird large
                console.log('Bird added to scene', object, 'Bounding box:', box, 'Size:', size); // Debug
                scene.add(object);
            },
            (xhr) => console.log((xhr.loaded / xhr.total * 100) + '% bird loaded'),
            (error) => console.error('Bird OBJ error:', error)
        );
    },
    (xhr) => console.log((xhr.loaded / xhr.total * 100) + '% bird materials loaded'),
    (error) => console.error('Bird MTL error:', error)
);

// Fog (Extra 1) - Using exponential fog for better effect
scene.fog = new THREE.FogExp2(0xaaaaaa, 0.035); // Fog density

// Picking (Extra 2)
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedObject = null;

window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(shapes);
    if (intersects.length > 0) {
        if (selectedObject) selectedObject.material.emissive.set(0x000000);
        selectedObject = intersects[0].object;
        selectedObject.material.emissive.set(0xffff00);
    } else if (selectedObject) {
        selectedObject.material.emissive.set(0x000000);
        selectedObject = null;
    }
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update animated objects
    animatedSphere.position.y = 2 + Math.sin(Date.now() * 0.001) * 2;
    
    // Update controls
    controls.update();
    
    // Render the scene
    renderer.render(scene, camera);
}
animate();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});