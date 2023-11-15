// Import libraries
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Rhino3dmLoader } from 'three/addons/loaders/3DMLoader.js'
import rhino3dm from 'rhino3dm'
import { RhinoCompute } from 'rhinocompute'

const definitionName = 'twisty.gh'

// Set up sliders
const radius_slider = document.getElementById('radius')
radius_slider.addEventListener('mouseup', onSliderChange, false)
radius_slider.addEventListener('touchend', onSliderChange, false)

const rotation_slider = document.getElementById('rotation')
rotation_slider.addEventListener('mouseup', onSliderChange, false)
rotation_slider.addEventListener('touchend', onSliderChange, false)

const loader = new Rhino3dmLoader()
loader.setLibraryPath( 'https://unpkg.com/rhino3dm@8.0.0-beta/' )

RhinoCompute.url = 'http://lisipe.modelical.com/' //if debugging locally.
RhinoCompute.apiKey = 'Speckle01Compute'

//RhinoCompute.url = getAuth( 'RHINO_COMPUTE_URL' ) // RhinoCompute server url. Use http://localhost:8081 if debugging locally.
//RhinoCompute.apiKey = getAuth( 'RHINO_COMPUTE_KEY' )  // RhinoCompute server api key. Leave blank if debugging locally.


let rhino, definition, doc
rhino3dm().then(async m => {
    console.log('Loaded rhino3dm.')
    rhino = m // global

    // load a grasshopper file!
    const url = definitionName
    const res = await fetch(url)
    const buffer = await res.arrayBuffer()
    const arr = new Uint8Array(buffer)
    definition = arr

    init()
    compute()
})

async function compute() {

    let pt1 = [0, 0, 0]
    let circle = new rhino.Circle(pt1, radius_slider.valueAsNumber)

    let curve = JSON.stringify(circle.toNurbsCurve().encode())

    const param1 = new RhinoCompute.Grasshopper.DataTree('curve')
    param1.append([0], [curve])

    const param2 = new RhinoCompute.Grasshopper.DataTree('rotate')
    param2.append([0], [rotation_slider.valueAsNumber])

    // clear values
    const trees = []
    trees.push(param1)
    trees.push(param2)



    const res = await RhinoCompute.Grasshopper.evaluateDefinition(definition, trees)
    console.log(res)
        


    doc = new rhino.File3dm()

    // hide spinner
    document.getElementById('loader').style.display = 'none'

    for (let i = 0; i < res.values.length; i++) {

        for (const [key, value] of Object.entries(res.values[i].InnerTree)) {
            for (const d of value) {

                const data = JSON.parse(d.data)
                const rhinoObject = rhino.CommonObject.decode(data)
                doc.objects().add(rhinoObject, null)

            }
        }
    }


    // clear objects from scene
    scene.traverse(child => {
        if (!child.isLight) {
            scene.remove(child)
        }
    })


    const buffer = new Uint8Array(doc.toByteArray()).buffer
    loader.parse(buffer, function (object) {

        scene.add(object)
        // hide spinner
        document.getElementById('loader').style.display = 'none'

    })
}


function onSliderChange() {
    // show spinner
    document.getElementById('loader').style.display = 'block'
    compute()
}



// BOILERPLATE //
let scene, camera, renderer, controls

function init() {

    // create a scene and a camera
    scene = new THREE.Scene()
    scene.background = new THREE.Color(1, 1, 1)
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.z = - 30

    // create the renderer and add it to the html
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(renderer.domElement)

    // add some controls to orbit the camera
    controls = new OrbitControls(camera, renderer.domElement)

    // add a directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff)
    directionalLight.intensity = 2
    scene.add(directionalLight)

    const ambientLight = new THREE.AmbientLight()
    scene.add(ambientLight)

    animate()
}

function animate() {
    requestAnimationFrame(animate)
    renderer.render(scene, camera)
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    animate()
}

function meshToThreejs(mesh, material) {
    const loader = new THREE.BufferGeometryLoader()
    const geometry = loader.parse(mesh.toThreejsJSON())
    return new THREE.Mesh(geometry, material)
}