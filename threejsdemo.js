//global vars
let scene, camera, renderer,line,canvas,torusKnot, 
    smallCube, smallCube2, core, smallCone1,smallcone2, 
    coneModel1,coneModel2, centerModel, starSphere, stars=[],
    lightsOnRadio, lightsOffRadio, newLight, light,upLight,
    rightLight,leftLight, orbitSphere;

//initialize scene, camera, renderer, etc.
function init() {

    //scene that all the models and cameras, etc. will be added to
    scene = new THREE.Scene();
    /*
        first param of camera is the camera frustum vertical fov
        second param is aspect ratio
        third and fourth params are camera near and far frustum
    */
    camera = new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight, 0.1,1000);
    //set camera position inside sphere planet
    camera.position.set(0,0,5);
    camera.lookAt(new THREE.Vector3(0,0,0));
    /**
     * lights will added to camera/scene when function turnOn or turnOff is called
     */
    //light blue light attached to the camera goes at 0.6 intensity
    light = new THREE.PointLight(0x57f6f1,0.6);
    //red light pointing up from point (0,-10,0)
    upLight = new THREE.DirectionalLight("red", 5);
    upLight.position.set(0,-10,0);

    //right light pointing to the right from point (10,0,0)
    rightLight = new THREE.DirectionalLight("green", 0.5);
    rightLight.position.set(10,0,0);

    //left light pointing to the left from point (-10,0,0)
    leftLight = new THREE.DirectionalLight("blue", 5);
    leftLight.position.set(-10,0,0);

    /**
     * renderer
     */

    //renderer is what draws the scene
    renderer = new THREE.WebGLRenderer({canvas: canvas,antialias: true});
    //resizes output canvas. min size for project3 is 640x480
    renderer.setSize(window.innerWidth /1.3, window.innerHeight / 1.3);
    //set background color
    renderer.setClearColor("black");
    document.body.appendChild(renderer.domElement);
    //used from OrbitControls.js. Allows mouse-dragging, wheel zoom in and out
    var controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.update();

    //cone model1 and model2
    coneModel1 = new THREE.Object3D();
    coneModel2 = new THREE.Object3D();
    //this is used to perform animation transforms on both cones as a single unit
    centerModel = new THREE.Object3D();
    //create cone1
    const coneGeo1 = new THREE.ConeGeometry(1,2,8,30);
    const coneMaterial1 = new THREE.MeshLambertMaterial({
        color: "white"
    })
    smallCone1 = new THREE.Mesh(coneGeo1,coneMaterial1);
    smallCone1.position.y = 1;
    coneModel1.add(smallCone1);
    centerModel.add(coneModel1);

    //create cone2
    const coneGeo2 = new THREE.ConeGeometry(1,2,8,30);
    const coneMaterial2 = new THREE.MeshLambertMaterial({
        color: "white"
    })
    smallCone2 = new THREE.Mesh(coneGeo2,coneMaterial2);
    smallCone2.scale.y = -1;
    smallCone2.position.y = -2;
    coneModel2.add(smallCone2);
    centerModel.add(coneModel2);

    //adding both cones as a single unit to the scene
    scene.add(centerModel);
    //create core
    const coreGeo = new THREE.SphereGeometry(.5,32,32);
    const coreMat = new THREE.MeshBasicMaterial({
        color: 0xa60707

    });
    core = new THREE.Mesh(coreGeo,coreMat);
    core.position.y = -0.5;
    centerModel.add(core);

    //create orbitSphere
    const orbitGeo = new THREE.SphereGeometry(1,32,32);
    const orbitMat  = new THREE.MeshBasicMaterial( { 
        color: "blue",
    });
    orbitSphere = new THREE.Mesh(orbitGeo,orbitMat);
    orbitSphere.position.y = -11;
    scene.add(orbitSphere);

    //create torus knot
    const torusGeometry = new THREE.TorusKnotGeometry(10,1);
    const torusMat = new THREE.MeshLambertMaterial( { 
            color: 0x227d10,
            wireframe:true
    });
    torusKnot = new THREE.Mesh( torusGeometry, torusMat );
    //position it above the sphere along the y-axis
    torusKnot.position.y = 15;
    torusKnot.scale.set(0.2,0.2,.5);
    scene.add(torusKnot);


    //create small box
    const smallBoxGeo = new THREE.BoxGeometry(1,1,1);
    const boxMaterial = new THREE.MeshLambertMaterial({
        color: "white",
        wireframe: false
    });
    smallCube = new THREE.Mesh(smallBoxGeo, boxMaterial);
    scene.add(smallCube);

    //create small box2
    const smallBoxGeo2 = new THREE.BoxGeometry(1,1,1);
    const boxMaterial2 = new THREE.MeshLambertMaterial({
        color: "white",
        wireframe: false
    });
    smallCube2 = new THREE.Mesh(smallBoxGeo2, boxMaterial2);
    scene.add(smallCube2);

    //create wireframe sphere
    const sphereGeo = new THREE.SphereGeometry(10,20,100);
    const wireFrame = new THREE.WireframeGeometry(sphereGeo);
    line = new THREE.LineSegments(wireFrame);
    line.material.depthTest =true;
    line.material.opacity = 0.25;
    line.material.transparent = true;
    scene.add(line);

    /**
     * widget controls
     */
    //adding event listener to radio buttons 
     lightsOnRadio = document.getElementById("lightsOn");
     lightsOnRadio.addEventListener("change", turnOn);

     lightsOffRadio = document.getElementById("lightsOff");
     lightsOffRadio.addEventListener("change", turnOff);
}//end init function


//methods to turn lights on or off
function turnOff() {
    console.log("lights off");
        camera.remove(light);
        scene.remove(upLight);
        scene.remove(rightLight);
        scene.remove(leftLight);
        render();
}

function turnOn() {
    console.log("lights on");
        camera.add(light);
        scene.add(upLight);
        scene.add(rightLight);
        scene.add(leftLight);
        render();
}

/**
 * adding starfield
 */
function addSphere(){

    // The loop will move from z position of -1000 to z position 1000, adding a random particle at each position. 
    for ( var z= -4000; z < 4000; z+=30) {

        // Make a sphere (exactly the same as before). 
        var geometry   = new THREE.SphereGeometry(0.5, 32, 32)
        var material = new THREE.MeshBasicMaterial( {color: 0xffffff} );
         starSphere = new THREE.Mesh(geometry, material)

        // This time we give the sphere random x and y positions between -500 and 500
        starSphere.position.x = Math.random() * 1000-500;
        starSphere.position.y = Math.random() * 1000-500;

        // Then set the z position to where it is in the loop (distance of camera)
        starSphere.position.z = z;

        //add the sphere to the scene
        scene.add( starSphere );

        //finally push it to the stars array 
        stars.push(starSphere); 
    }
}

//animate starfield
function animateStars() { 
    
    // loop through each star
    for(var i=0; i<stars.length; i++) {

        star = stars[i]; 
            
        // and move it forward
        star.position.z += i/10;
            
        // if the particle is too close move it to the back
        if(star.position.z>100) star.position.z-=2000; 

    }

}



//this function animates the scene
function animate() {
    //using a timestamp for animations
    var myTime = Date.now() * 0.0001;
    //creates an infinite loop that makes renderer
    //redraw scene everytime screen is refreshed which is about 60fps
    requestAnimationFrame(animate);


    //animate top conemodel
    coneModel1.position.y = Math.sin(myTime*10) * 0.5;
    //animate bottom conemodel
    coneModel2.position.y = -Math.sin(myTime*10) * 0.5;

    //animate cones
    smallCone1.rotation.y = myTime*50;
    smallCone2.rotation.y = myTime*50;

    //animate centerModel
   centerModel.rotation.x = (myTime * 10) * 5;
   centerModel.rotation.z = (myTime * 10);
    //wireframe planet animation
     line.rotation.x +=0.01;
     line.rotation.y +=0.01;
     line.rotation.z +=0.01;

    //inner small box animation
    //bounce around inside of sphere planet
    smallCube.position.x = Math.cos(myTime*20) * 5;
    smallCube.position.z = Math.cos(myTime*20) * 4;
    smallCube.position.z = Math.sin(myTime*20) * -4;
    //rotate the cube
    smallCube.rotation.x += 0.03;
    smallCube.rotation.y += 0.09;
    smallCube.rotation.z += 0.03;

    //inner small box2 animation
    //bounce around inside of sphere planet
    smallCube2.position.x = -Math.cos(myTime*20) * 5;
    smallCube2.position.z = -Math.cos(myTime*20) * 4;
    smallCube2.position.z = -Math.sin(myTime*20) * -4;
    //rotate the cube
    smallCube2.rotation.x -= 0.03;
    smallCube2.rotation.y -= 0.09;
    smallCube2.rotation.z -= 0.03;


    //torus animation
    /**
     *  rotation around mesh sphere planet
        cos creates the back and forth effect along x axis
        sin creates up and down effect along y axis, 
        myTime is the current timestamp multiplied by the speed (x and y should match)
        the last term is the height and length of the orbit
     */
    torusKnot.position.x = -Math.cos(myTime*4) * 15;
    torusKnot.position.y = Math.sin(myTime*4) * 15;
    //rotating the torus itself
    torusKnot.rotation.y += 0.12;

    //orbitSphere animation
    orbitSphere.position.x = Math.cos(myTime*30) * 10;
    orbitSphere.position.y = Math.cos(myTime*30) * 10;
    orbitSphere.position.z = -Math.sin(myTime*30) * 15;

    //finally, draw the scene
    render();
}

//this function draws the scene
function render() {
    renderer.render(scene, camera);
    animateStars();
}

//initialize scene
init();
//add star spheres
addSphere();
//call the function
animate();