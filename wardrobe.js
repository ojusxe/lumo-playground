import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/controls/OrbitControls.js';

class WardrobeManager {
    constructor() {
        // Configuration
        this.models = ['George', 'Leela', 'Mike', 'Stan'];
        this.colorVariations = ['default', '1', '2', '3', '4'];
        
        // State
        this.selectedModel = 'Stan';
        this.selectedColor = 'default';
        this.currentGLTF = null;
        this.currentModel = null;
        this.animationMixer = null;
        this.animationActions = {};
        this.currentAction = null;
        this.clock = new THREE.Clock();
        
        // Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.gltfLoader = new GLTFLoader();
        this.textureLoader = new THREE.TextureLoader();
        
        // DOM elements
        this.previewContainer = document.getElementById('preview-canvas-container');
        this.loadingIndicator = document.getElementById('loading-indicator');
        this.animationSelect = document.getElementById('animation-select');
        
        // Initialize
        const saved = this.getSavedCharacter();
        if (saved) {
            if (typeof saved.model === 'string' && this.models.includes(saved.model)) {
                this.selectedModel = saved.model;
            }
            if (typeof saved.color === 'string' && this.colorVariations.includes(saved.color)) {
                this.selectedColor = saved.color;
            }
        }
        this.init();
    }

    getSavedCharacter() {
        try {
            const raw = localStorage.getItem('lumo_character');
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return null;
            return parsed;
        } catch {
            return null;
        }
    }
    
    init() {
        this.setupThreeJS();
        this.setupEventListeners();
        this.loadModel(this.selectedModel, this.selectedColor);
        this.animate();
        
        // Set initial selection states
        this.updateSelectionUI();
    }
    
    setupThreeJS() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a);
        
        // Camera
        const aspect = this.previewContainer.clientWidth / this.previewContainer.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
        this.camera.position.set(0, 1.5, 4);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.previewContainer.clientWidth, this.previewContainer.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.previewContainer.appendChild(this.renderer.domElement);
        
        // Orbit Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 2;
        this.controls.maxDistance = 10;
        this.controls.target.set(0, 1, 0);
        this.controls.update();
        
        // Lighting
        this.setupLighting();
        
        // Ground plane
        this.addGround();
        
        // Handle resize
        window.addEventListener('resize', () => this.onResize());
    }
    
    setupLighting() {
        // Ambient light
        const ambient = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambient);
        
        // Main directional light
        const mainLight = new THREE.DirectionalLight(0xffffff, 1);
        mainLight.position.set(5, 10, 5);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 1024;
        mainLight.shadow.mapSize.height = 1024;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 50;
        this.scene.add(mainLight);
        
        // Fill light
        const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
        fillLight.position.set(-5, 5, -5);
        this.scene.add(fillLight);
        
        // Rim light
        const rimLight = new THREE.DirectionalLight(0x00ffff, 0.4);
        rimLight.position.set(0, 5, -10);
        this.scene.add(rimLight);
    }
    
    addGround() {
        const groundGeometry = new THREE.CircleGeometry(5, 32);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }
    
    setupEventListeners() {
        // Model selection
        document.querySelectorAll('.model-card').forEach(card => {
            card.addEventListener('click', () => {
                this.selectedModel = card.dataset.model;
                this.updateSelectionUI();
                this.loadModel(this.selectedModel, this.selectedColor);
            });
        });
        
        // Color selection
        document.querySelectorAll('.color-card').forEach(card => {
            card.addEventListener('click', () => {
                this.selectedColor = card.dataset.color;
                this.updateSelectionUI();
                this.applyColorVariation(this.selectedColor);
            });
        });
        
        // Animation controls
        this.animationSelect.addEventListener('change', (e) => {
            this.playAnimation(e.target.value);
        });
        
        document.getElementById('play-animation').addEventListener('click', () => {
            const animName = this.animationSelect.value;
            if (animName) {
                this.playAnimation(animName);
            }
        });
        
        // Save character
        document.getElementById('save-character').addEventListener('click', () => {
            this.saveCharacter();
        });
        
        // Use in playground
        document.getElementById('use-character').addEventListener('click', () => {
            this.useInPlayground();
        });
    }
    
    updateSelectionUI() {
        // Update model cards
        document.querySelectorAll('.model-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.model === this.selectedModel);
        });
        
        // Update color cards
        document.querySelectorAll('.color-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.color === this.selectedColor);
        });
        
        // Update color thumbnails based on selected model
        this.updateColorThumbnails();
    }
    
    updateColorThumbnails() {
        const model = this.selectedModel;
        const basePath = 'assets/Animated Mech Pack/Textured/Textures';
        
        // Default color thumbnail
        const defaultThumb = document.getElementById('color-default');
        if (defaultThumb) {
            defaultThumb.src = `${basePath}/${model}_Texture.png`;
        }
        
        // Color variations 1-4
        for (let i = 1; i <= 4; i++) {
            const thumb = document.getElementById(`color-${i}`);
            if (thumb) {
                thumb.src = `${basePath}/Color Variations/${model}_${i}_Texture.png`;
            }
        }
    }
    
    async loadModel(modelName, colorVariation) {
        this.showLoading(true);
        
        // Remove current model
        if (this.currentModel) {
            this.scene.remove(this.currentModel);
            this.currentModel = null;
        }
        
        // Stop current animations
        if (this.animationMixer) {
            this.animationMixer.stopAllAction();
            this.animationMixer = null;
        }
        this.animationActions = {};
        this.currentAction = null;
        
        // Determine which folder to use based on color
        const useTextured = colorVariation !== 'default';
        const basePath = useTextured 
            ? 'assets/Animated Mech Pack/Textured/glTF/'
            : 'assets/Animated Mech Pack/Flat Colors/glTF/';
        
        const modelPath = `${basePath}${modelName}.gltf`;
        
        try {
            const gltf = await this.loadGLTF(modelPath);
            this.currentGLTF = gltf;
            this.currentModel = gltf.scene;
            
            // Setup model
            this.currentModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            // Center and scale model
            const box = new THREE.Box3().setFromObject(this.currentModel);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            // Reset position to center
            this.currentModel.position.x = -center.x;
            this.currentModel.position.y = -box.min.y;
            this.currentModel.position.z = -center.z;
            
            // Scale if needed
            const maxDim = Math.max(size.x, size.y, size.z);
            if (maxDim > 3) {
                const scale = 3 / maxDim;
                this.currentModel.scale.setScalar(scale);
            }
            
            this.scene.add(this.currentModel);

            // Frame camera/controls so the full character is visible from a front view
            this.frameModelInView();
            
            // Apply texture if needed
            if (useTextured) {
                await this.applyColorVariation(colorVariation);
            }
            
            // Setup animations
            this.setupAnimations(gltf);
            
            this.showLoading(false);
        } catch (error) {
            console.error('Error loading model:', error);
            this.showLoading(false);
            this.showToast('Error loading model. Check console for details.');
        }
    }

    frameModelInView() {
        if (!this.currentModel || !this.camera || !this.controls) return;

        const box = new THREE.Box3().setFromObject(this.currentModel);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const fov = THREE.MathUtils.degToRad(this.camera.fov);
        const halfHeight = size.y / 2;
        const halfWidth = size.x / 2;

        const distHeight = halfHeight / Math.tan(fov / 2);
        const distWidth = halfWidth / (Math.tan(fov / 2) * this.camera.aspect);
        const distance = Math.max(distHeight, distWidth, 1) * 1.25;

        this.controls.target.copy(center);
        this.camera.position.set(center.x, center.y, center.z + distance);
        this.camera.near = Math.max(distance / 100, 0.01);
        this.camera.far = Math.max(distance * 100, 100);
        this.camera.updateProjectionMatrix();

        this.controls.minDistance = Math.max(distance * 0.4, 0.5);
        this.controls.maxDistance = distance * 3;
        this.controls.update();
    }
    
    loadGLTF(path) {
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(
                path,
                (gltf) => resolve(gltf),
                (progress) => {
                    // Progress callback
                },
                (error) => reject(error)
            );
        });
    }
    
    async applyColorVariation(colorVariation) {
        if (!this.currentModel) return;
        
        if (colorVariation === 'default') {
            // Reload model with flat colors
            await this.loadModel(this.selectedModel, 'default');
            return;
        }
        
        // Load the texture for this variation
        const texturePath = `assets/Animated Mech Pack/Textured/Textures/Color Variations/${this.selectedModel}_${colorVariation}_Texture.png`;
        
        try {
            const texture = await this.loadTexture(texturePath);
            texture.flipY = false;
            texture.colorSpace = THREE.SRGBColorSpace;
            
            // Apply texture to all meshes
            this.currentModel.traverse((child) => {
                if (child.isMesh && child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => {
                            mat.map = texture;
                            mat.needsUpdate = true;
                        });
                    } else {
                        child.material.map = texture;
                        child.material.needsUpdate = true;
                    }
                }
            });
        } catch (error) {
            console.error('Error loading texture:', error);
            // Try loading the base texture instead
            const baseTexturePath = `assets/Animated Mech Pack/Textured/Textures/${this.selectedModel}_Texture.png`;
            try {
                const texture = await this.loadTexture(baseTexturePath);
                texture.flipY = false;
                texture.colorSpace = THREE.SRGBColorSpace;
                
                this.currentModel.traverse((child) => {
                    if (child.isMesh && child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => {
                                mat.map = texture;
                                mat.needsUpdate = true;
                            });
                        } else {
                            child.material.map = texture;
                            child.material.needsUpdate = true;
                        }
                    }
                });
            } catch (e) {
                console.error('Error loading base texture:', e);
            }
        }
    }
    
    loadTexture(path) {
        return new Promise((resolve, reject) => {
            this.textureLoader.load(
                path,
                (texture) => resolve(texture),
                undefined,
                (error) => reject(error)
            );
        });
    }
    
    setupAnimations(gltf) {
        if (!gltf.animations || gltf.animations.length === 0) {
            this.animationSelect.innerHTML = '<option value="">No animations available</option>';
            return;
        }
        
        this.animationMixer = new THREE.AnimationMixer(this.currentModel);
        
        // Clear existing options
        this.animationSelect.innerHTML = '';
        
        // Add animation options
        gltf.animations.forEach((clip, index) => {
            const action = this.animationMixer.clipAction(clip);
            this.animationActions[clip.name] = action;
            
            const option = document.createElement('option');
            option.value = clip.name;
            option.textContent = clip.name || `Animation ${index + 1}`;
            this.animationSelect.appendChild(option);
        });
        
        // Auto-play first animation
        if (gltf.animations.length > 0) {
            this.playAnimation(gltf.animations[0].name);
        }
    }
    
    playAnimation(animationName) {
        if (!this.animationMixer || !this.animationActions[animationName]) return;
        
        // Fade out current action
        if (this.currentAction) {
            this.currentAction.fadeOut(0.3);
        }
        
        // Play new action
        const action = this.animationActions[animationName];
        action.reset();
        action.fadeIn(0.3);
        action.play();
        
        this.currentAction = action;
    }
    
    saveCharacter() {
        const characterData = {
            model: this.selectedModel,
            color: this.selectedColor,
            timestamp: Date.now()
        };
        
        localStorage.setItem('lumo_character', JSON.stringify(characterData));
        this.showToast('Character saved! 💾');
    }
    
    useInPlayground() {
        // Save first
        this.saveCharacter();
        
        // Navigate to playground
        this.showToast('Redirecting to playground...');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
    
    showLoading(show) {
        if (this.loadingIndicator) {
            this.loadingIndicator.classList.toggle('hidden', !show);
        }
    }
    
    showToast(message) {
        // Remove existing toast
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
    
    onResize() {
        if (!this.previewContainer) return;
        
        const width = this.previewContainer.clientWidth;
        const height = this.previewContainer.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);

        // Keep the character framed on resize
        this.frameModelInView();
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const delta = this.clock.getDelta();
        
        // Update animation mixer
        if (this.animationMixer) {
            this.animationMixer.update(delta);
        }
        
        // Update controls
        if (this.controls) {
            this.controls.update();
        }
        
        // Render
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new WardrobeManager();
});
