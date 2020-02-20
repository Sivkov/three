let camera, scene, renderer, mesh, material, e, objects, imgData, uv, info, lon = 0, lat = 0;

var mouseDown = {};
var mouse = new THREE.Vector2();
var raycaster = new THREE.Raycaster();
var canvas = document.createElement('canvas');
var ctx = canvas.getContext('2d');

let img = [
    "https://imgur.com/ewPPOIK.jpg",
    "https://i.imgur.com/B4uLjgn.jpg",
    "https://i.imgur.com/OA6fI3G.jpg",
    "https://i.imgur.com/qYLIyFQ.jpg",
    "https://i.imgur.com/YyTJskt.jpg",
    "https://i.imgur.com/YvGxlcN.jpg",
    "https://i.imgur.com/IzOFnIC.jpg"
]
let backImg = ["https://i.imgur.com/NUKbrbl.png"]
let objectsInn = [{
    "255,0,0": "Розетка 1",
    "245,0,0": "Окно 1",
    "235,0,0": "Лоток",
    "225,0,0": "Коробка",
    "215,0,0": "Ящик стола",
    "205,0,0": "Розетка 2",
    "195,0,0": "Камин",
    "185,0,0": "Окно 2",
    "175,0,0": "А здесь был лось",
    "165,0,0": "Стол"
}]


function init(json) {
    objects = json.objects;
    camera = new THREE.PerspectiveCamera(80, innerWidth / innerHeight, 1, 1100);
    camera.target = new THREE.Vector3(0, 0, 0);
    scene = new THREE.Scene();
    let geometry = new THREE.SphereBufferGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);
    material = createMaterial(json.texture, json.stencil);
    scene.add(mesh = new THREE.Mesh(geometry, material));
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(devicePixelRatio);
    renderer.setSize(innerWidth, innerHeight);
    document.body.append(renderer.domElement);
    info = document.createElement('div');
    info.id = 'info';
    document.body.append(info);
    addEventListener('mousedown', onPointerStart);
    addEventListener('mousemove', onPointerMove);
    addEventListener('mouseup', onPointerUp);
    addEventListener('wheel', onDocumentMouseWheel);
    addEventListener('touchstart', onPointerStart);
    addEventListener('touchmove', onPointerMove);
    addEventListener('touchend', onPointerUp);
    addEventListener('resize', onWindowResize);
    animate();
}

function createMaterial(img, stencil) {
    let textureLoader = new THREE.TextureLoader();
    let stencilImage = new Image();
    stencilImage.crossOrigin = "anonymous";
    stencilImage.src = stencil;
    stencilImage.onload = function () {
        canvas.width = stencilImage.width;
        canvas.height = stencilImage.height;
        ctx.drawImage(stencilImage, 0, 0);
        imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    };
    return new THREE.ShaderMaterial({
        uniforms: {
            mouse: { type: "2f", value: mouse },
            texture1: { type: "t", value: textureLoader.load(img) },
            texture2: { type: "t", value: textureLoader.load(stencil) }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }`,
        fragmentShader: `
            precision highp float;
            varying vec2 vUv;
            uniform vec2 mouse;
            uniform sampler2D texture1;
            uniform sampler2D texture2;
            void main() {
                vec4 stencil = texture2D(texture2, vUv);
                gl_FragColor = texture2D(texture1, vUv);
                vec4 c = texture2D(texture2, mouse);
                if (abs(c.x - stencil.x) < 0.0001 && stencil.x > 0.)
                    gl_FragColor += vec4(0.,0.2,0,0.);
            }`
    })
}

function onWindowResize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
}

function onPointerStart(event) {
    mouseDown.x = event.clientX || event.touches[0].clientX;
    mouseDown.y = event.clientY || event.touches[0].clientY;
    mouseDown.lon = lon;
    mouseDown.lat = lat;
}

function raycast(event) {
    var rect = renderer.domElement.getBoundingClientRect();
    var x = (event.clientX - rect.left) / rect.width,
        y = (event.clientY - rect.top) / rect.height;
    mouse.set(x * 2 - 1, 1 - y * 2);
    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObjects(scene.children);
    if (intersects.length > 0 && intersects[0].uv) {
        material.uniforms.mouse.value = uv = intersects[0].uv;
        if (!imgData) return;
        let y = Math.floor((1 - uv.y) * canvas.height);
        let x = Math.floor(uv.x * canvas.width);
        let off = Math.floor(y * canvas.width + x) * 4;
        let r = imgData.data[off];
        let g = imgData.data[off + 1];
        let b = imgData.data[off + 2];
        info.innerHTML = objects[`${r},${g},${b}`];
        info.style.left = event.clientX + 15 + 'px';
        info.style.top = event.clientY + 'px';
        info.style.opacity = r + g + b ? 1 : 0;
    }
}

function onPointerMove(event) {
    raycast(e = event);
    if (!mouseDown.x) return;
    let clientX = event.clientX || event.touches[0].clientX;
    let clientY = event.clientY || event.touches[0].clientY;
    lon = (mouseDown.x - clientX) * camera.fov / 600 + mouseDown.lon;
    lat = (clientY - mouseDown.y) * camera.fov / 600 + mouseDown.lat;
    lat = Math.max(- 85, Math.min(85, lat));
}

function onPointerUp() {
    mouseDown.x = null;
}

function onDocumentMouseWheel(event) {
    let fov = camera.fov + event.deltaY * 0.05;
    camera.fov = THREE.Math.clamp(fov, 10, 75);
    camera.updateProjectionMatrix();
}

function animate() {
    requestAnimationFrame(animate);

    let phi = THREE.Math.degToRad(90 - lat);
    let theta = THREE.Math.degToRad(lon);
    camera.target.x = 0.001 * Math.sin(phi) * Math.cos(theta);
    camera.target.y = 0.001 * Math.cos(phi);
    camera.target.z = 0.001 * Math.sin(phi) * Math.sin(theta);
    camera.lookAt(camera.target);
    e && raycast(e);
    renderer.render(scene, camera);
}

$(".room").click(
    function () {
        $("canvas").detach();
        $("#info").detach();
        $(".btn-circle").addClass("btn-success").removeClass("btn-info");
        $(`[data-info=${$(this).attr("data-item")}]`).addClass("btn-info").removeClass("btn-success");

        init({
            texture: img[$(this).attr("data-item")],
            stencil: backImg[0],
            objects: objectsInn[0]
        })
    }
)


$(".btn-circle").click(
    function () {
        $("canvas").detach();
        $("#info").detach();
        $(".btn-circle").addClass("btn-success").removeClass("btn-info");
        $(event.currentTarget).addClass("btn-info").removeClass("btn-success");
       
        init({
            texture: img[$(this).attr("data-info")],
            stencil: backImg[0],
            objects: objectsInn[0]
        })
    }
)

const fixDot= function () {
    var position = $("#mapimg").offset()
    for (let i = 1; i < 7; i++) {
        $(`[data-info="${i}"]`).offset(function () {
            return { top: position.top + $("#mapimg").height() * $(this).attr("data-height"), 
                    left: position.left + $("#mapimg").width() * $(this).attr("data-width") };
        })
    }
}

$("#map").click(function () {
    $("#map").toggleClass("mapmax mapmin")
    $('#mapimg').toggleClass("mapimgmax mapimgmin")
    var position = $("#mapimg").offset()
    console.log($("#mapimg").width() + " " + $("#mapimg").height() + " " + position.top + " " + position.left)



});
/*
$(window).resize(function () {
    var position = $("#mapimg").offset()
    for (let i = 1; i < 7; i++) {
        $(`[data-info="${i}"]`).offset(function () {
            return { top: position.top + $("#mapimg").height() * $(this).attr("data-height"), 
                     left: position.left + $("#mapimg").width() * $(this).attr("data-width") };
        })
    }
})

$(document).ready(function () {
  
})
*/




$(document).on("ready",  fixDot);
$(window).on("resize", fixDot);
$("#map").on("click", fixDot);


$('[data-item="2"]').click()


