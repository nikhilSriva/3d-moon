import {useEffect, useRef, useState} from "react";
import * as THREE from "three";
import "./index.scss";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import EarthTexture from './assets/textures/earthmap1k.jpg'
import EarthBumpTex from './assets/textures/earthbump1k.jpg'
import ParticleMap from './assets/textures/circle_05.png'
import GalaxyTex from './assets/textures/galaxy.png'
import {CSS2DObject, CSS2DRenderer} from "three/addons/renderers/CSS2DRenderer.js";

const SIZES = {width: window.innerWidth, height: window.innerHeight};
const PLANETS = [{
    key: 3, name: 'earth', bumpMap: EarthBumpTex, texture: EarthTexture, x: 0, radius: 3
},]
var paris = {
    lat: 28.6139, lon: 77.2090
};

function degreesToRadians(degrees) {
    return degrees * Math.PI / 180;
}

const latRadians = degreesToRadians(paris.lat);
const lonRadians = degreesToRadians(paris.lon);

const x = 1 * Math.cos(latRadians) * Math.cos(lonRadians);
const y = 1 * Math.cos(latRadians) * Math.sin(lonRadians);
const z = 1 * Math.sin(latRadians);


export const App = () => {
    const clock = useRef(new THREE.Clock())
    const camera = useRef(null);
    const [loading, setLoading] = useState(false);
    const renderer = useRef(null);
    const particleGeometry = useRef(null);
    const _scene = useRef(null);
    const orbitControl = useRef(null);
    const raycaster = useRef(null);
    const currentIntersect = useRef(null);
    const _canvas = useRef(null);
    const starMesh = useRef(null);
    const planets = useRef([]);
    const mousePointer = useRef(new THREE.Vector2());
    const labelRenderer = useRef(new CSS2DRenderer());

    const onResize = () => {
        const _camera = camera.current, _renderer = renderer.current;
        if (_camera && _renderer) {
            // update sizes
            SIZES.width = window.innerWidth;
            SIZES.height = window.innerHeight;

            //   update camera
            _camera.aspect = SIZES.width / SIZES.height;
            _camera.updateProjectionMatrix();

            //   update renderer
            _renderer.setSize(SIZES.width, SIZES.height);
            _renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        }
    };

    useEffect(() => {
        renderModel();
        createLabelRenderers();
        // Handing Resize
        window.addEventListener("resize", onResize);
        window.addEventListener("mousemove", onPointMove);

        return () => {
            window.removeEventListener("resize", onResize);
            window.removeEventListener("mousemove", onPointMove);
        };
    }, []);

    const onPointMove = (event) => {
        // calculate pointer position in normalized device coordinates
        mousePointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
        mousePointer.current.y = -(event.clientY / window.innerHeight * 2 - 1);
    }

    const renderModel = () => {
        const scene = new THREE.Scene();
        _scene.current = scene
        const manager = new THREE.LoadingManager();
        const textureLoader = new THREE.TextureLoader(manager);
        manager.onStart = function () {
            console.log('Loading ßtarted!');
            setLoading(true);
        };
        manager.onLoad = function () {
            console.log('Loading complete!');
            setLoading(false);
        };

        //render planets
        PLANETS.forEach(planet => {
            const item = new THREE.Mesh(new THREE.SphereGeometry(planet.radius, 32, 32), new THREE.MeshStandardMaterial({
                bumpMap: textureLoader.load(planet.bumpMap), map: textureLoader.load(planet.texture), wireframe: false
            }))
            item.receiveShadow = true;
            item.uuid = planet.name
            item.position.x = planet.x;
            planets.current.push(item);
            scene.add(item)
        })

        //camera
        camera.current = new THREE.PerspectiveCamera(70, SIZES.width / SIZES.height, 0.1);
        camera.current.position.set(0, 6, 10);
        scene.add(camera.current)

        const canvas = document.querySelector('.canvas');
        _canvas.current = canvas;
        orbitControl.current = new OrbitControls(camera.current, canvas)
        orbitControl.current.enableDamping = true
        console.log(planets.current)

        setTimeout(() => {

            let material = new THREE.MeshPhongMaterial({color: 'red'});

            let sphere = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 8), material);
            sphere.position.set(x, y, z)
            // scene.add(sphere);

            const optionTag = document.createElement('div');
            optionTag.className = 'action-btns';
            let text = document.createElement('p');
            text.textContent = 'Hello'
            optionTag.appendChild(text)
            // optionTag.textContent = 'Press T to sit';
            const optionLabel = new CSS2DObject(optionTag);
            optionLabel.position.set(x, y, z)
            scene.add(optionLabel);


        }, 1000)
        //galaxy
        const starGeometry = new THREE.SphereGeometry(80, 64, 64);
        const starMaterial = new THREE.MeshBasicMaterial({
            map: textureLoader.load(GalaxyTex), side: THREE.BackSide, transparent: true,
        });
        starMesh.current = new THREE.Mesh(starGeometry, starMaterial);
        scene.add(starMesh.current);

        //lights
        const pointLight = new THREE.AmbientLight(0xffffff, 2);
        scene.add(pointLight)
        /**
         * Particles
         * */

        // const particleGeometry = new THREE.SphereGeometry(1, 32, 32);
        particleGeometry.current = new THREE.BufferGeometry();
        const count = 20000;
        let positions = new Float32Array(count * 3);
        let colors = new Float32Array(count * 3);
        for (let i = 0; i < count * 3; i++) {
            positions[i] = (Math.random() - 0.5) * 10;
            colors[i] = Math.random();
        }
        particleGeometry.current.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        particleGeometry.current.setAttribute('color', new THREE.BufferAttribute(colors, 3))
        const particleMaterial = new THREE.PointsMaterial({size: 0.1, sizeAttenuation: true})
        particleMaterial.alphaMap = textureLoader.load(ParticleMap)
        particleMaterial.transparent = true
        particleMaterial.depthWrite = false
        particleMaterial.blending = THREE.AdditiveBlending;
        particleMaterial.vertexColors = true;
        const particle = new THREE.Points(particleGeometry.current, particleMaterial);
        particle.position.x = -3
        // scene.add(particle)


        /**
         * Raycaster
         * */
        raycaster.current = new THREE.Raycaster();

        //renderer
        renderer.current = new THREE.WebGLRenderer({canvas});
        renderer.current.shadowMap.enabled = true
        renderer.current.setSize(SIZES.width, SIZES.height)
        renderer.current.setPixelRatio(window.devicePixelRatio)
        renderer.current.render(scene, camera.current);
        tick(scene);
    };

    const tick = (scene,) => {
        orbitControl.current.update();
        let _labelRenderer = labelRenderer.current;

        //raycaster
        raycaster.current.setFromCamera(mousePointer.current, camera.current)
        const intersects = raycaster.current.intersectObjects(planets.current);
        if (intersects.length) {
            if (!currentIntersect.current) {
                _canvas.current.style.cursor = 'pointer'
                // SPEED_FACTOR.current = 0.2;
            }
            currentIntersect.current = intersects[0];
        } else {
            if (currentIntersect.current) {
                _canvas.current.style.cursor = 'default'
                // SPEED_FACTOR.current = 1
            }
            currentIntersect.current = null;
        }
        particleGeometry.current.attributes.position.needsUpdate = true;
        starMesh.current.rotation.z += 0.0001;
        starMesh.current.rotation.x += 0.0001;
        starMesh.current.rotation.y += 0.0001;
        _labelRenderer.render(scene, camera.current);
        renderer.current.render(scene, camera.current);
        window.requestAnimationFrame(() => tick(scene));
    };

    const createLabelRenderers = () => {
        let _labelRenderer = new CSS2DRenderer();
        _labelRenderer.setSize(window.innerWidth, window.innerHeight);
        _labelRenderer.domElement.style.position = 'absolute';
        _labelRenderer.domElement.style.top = '0px';
        _labelRenderer.domElement.style.pointerEvents = 'none';
        labelRenderer.current = _labelRenderer;
        document.body.appendChild(_labelRenderer.domElement);
    }
    return (<div className={"scene"}>
        <canvas className={"canvas"}/>
        {loading && <p className={'loading'}>Loading...</p>}
    </div>);
};
