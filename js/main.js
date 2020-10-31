const MAX_INSTANCES = 10000
const SIMULATION_SIZE = { x: 1.5, y: 1.3, z: 1.5 }
const POINT_SIZE = 0.005

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x282a36);

// Perspective settings
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.z = 2.5
camera.position.y = 0.7
camera.lookAt(new THREE.Vector3(0, 1, 0))

// Orthographic settings
// const camera = new THREE.OrthographicCamera(window.innerWidth / -500, window.innerWidth / 500, window.innerHeight / 500, window.innerHeight / -500, 0.1, 1000)
// camera.position.z = 2
// camera.position.y = 1.5
// camera.lookAt(new THREE.Vector3(0, 1, 0))

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const box_geometry = new THREE.BoxBufferGeometry(POINT_SIZE, POINT_SIZE, POINT_SIZE)
const dot_material = new THREE.MeshBasicMaterial({ color: 0xcccccc })

const active_instances = []

const visibility_states = {
    VISIBLE: "visible",
    HIDDEN: "hidden",
    JUST_REFOCUSED: "just_refocused",
}
let last_timestamp = 0
let visibility_state = visibility_states.VISIBLE
let n_points = 0
let depth = {}

const camera_pivot = new THREE.Group()
camera_pivot.add(camera)
scene.add(camera_pivot)

camera_pivot.rotation.y = Math.PI / 4

const instances = new THREE.InstancedMesh(box_geometry, dot_material, MAX_INSTANCES)
scene.add(instances)

new_point_add_loop()
animate()

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight)
})

document.addEventListener('visibilitychange', e => {
    if (document.hidden) {
        visibility_state = visibility_states.HIDDEN
        browser_just_refocused = true
    } else {
        if (visibility_state == visibility_states.HIDDEN) {
            visibility_state = visibility_states.JUST_REFOCUSED
        }
    }
})

function new_point_add_loop() {
    for (let i = 0; i < 20; i++) {
        n_points += 1
        reset_point(n_points % MAX_INSTANCES)
    }

    setTimeout(new_point_add_loop, 20)
}

function animate(timestamp = 0) {
    const delta_time = (timestamp - last_timestamp) / 1000
    last_timestamp = timestamp

    // Avoid browser innacuracies when tabbing out
    if (delta_time > 1 / 15) {
        requestAnimationFrame(animate)
        return
    }

    const matrix = new THREE.Matrix4()
    const pos = new THREE.Vector3()

    for (let i = 0; i < active_instances.length; i++) {
        const instance_index = active_instances[i]

        instances.getMatrixAt(instance_index, matrix)
        pos.setFromMatrixPosition(matrix)

        if (pos.y <= 0 || distance3dSq(pos.x, pos.y, pos.z, 0.03, 0, 0.03) < 0.1 || get_depth_at(pos.x, pos.z) >= pos.y) {
            active_instances.splice(i, 1)
            add_depth_at(pos.x, pos.z)
            i -= 1
        } else {
            matrix.setPosition(
                pos.x + 0.02 * delta_time,
                pos.y + -0.5 * delta_time,
                pos.z + 0.02 * delta_time)
        }

        instances.setMatrixAt(instance_index, matrix)
    }

    instances.instanceMatrix.needsUpdate = true;

    camera_pivot.rotation.y += .2 * delta_time

    renderer.render(scene, camera)

    requestAnimationFrame(animate)
}

function reset_point(instance_index) {
    const matrix = new THREE.Matrix4()

    matrix.setPosition(
        random(-SIMULATION_SIZE.x / 2, SIMULATION_SIZE.x / 2),
        SIMULATION_SIZE.y,
        random(-SIMULATION_SIZE.z / 2, SIMULATION_SIZE.z / 2))

    instances.setMatrixAt(instance_index, matrix)

    active_instances.push(instance_index)
}

function get_depth_at(x, z) {
    x = Math.round(x * 100)
    z = Math.round(z * 100)

    if (!depth[`${x},${z}`]) {
        depth[`${x},${z}`] = 0
        return 0
    } else {
        return depth[`${x},${z}`]
    }
}

function add_depth_at(x, z) {
    x = Math.round(x * 100)
    z = Math.round(z * 100)

    if (!depth[`${x},${z}`]) {
        depth[`${x},${z}`] = POINT_SIZE
        return
    } else {
        depth[`${x},${z}`] += POINT_SIZE
        return
    }
}

function distance3dSq(x1, y1, z1, x2, y2, z2) {
    return (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1) + (z2 - z1) * (z2 - z1)
}

function random(a, b) { return a + Math.random() * (b - a) }
function random_int(a, b) { Math.round(a + Math.random() * (b - a)) }