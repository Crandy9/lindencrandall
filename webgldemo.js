"use strict";

var gl;   // The webgl context.
var zval = 0;
var yval = 0;
var a_coords_loc;         // Location of the a_coords attribute variable in the shader program.
var a_normal_loc;         // Location of a_normal attribute 
var a_texCoords_loc; 

var u_modelview;       // Locations for uniform matrices
var u_projection;
var u_normalMatrix;

var u_material;     // An object tolds uniform locations for the material.
var u_lights;       // An array of objects that holds uniform locations for light properties.

var projection = mat4.create();    // projection matrix
var modelview;                     // modelview matrix; value comes from rotator
var normalMatrix = mat3.create();  // matrix, derived from modelview matrix, for transforming normal vectors

var rotator;  // A TrackballRotator to implement rotation by mouse.

 var frameNumber = 0;  // frame number during animation (actually only goes up by 0.5 per frame)

var torus, sphere, cone, cylinder, disk, ring, cube;  // basic objects, created using function createModel

var matrixStack = [];           // A stack of matrices for implementing hierarchical graphics.

var currentColor = [1,1,1,1];   // The current diffuseColor; render() functions in the basic objects set
                                // the diffuse color to currentColor when it is called before drawing the object.
                                // Other color properties, which don't change often are handled elsewhere.


/**
 *  VBO function used from diskplay.html
 */
function createModel(modelData, xtraTranslate) {
    var model = {};
    model.coordsBuffer = gl.createBuffer();
    model.normalBuffer = gl.createBuffer();
    model.indexBuffer = gl.createBuffer();
    model.count = modelData.indices.length;
    if (xtraTranslate)
        model.xtraTranslate = xtraTranslate;
    else
        model.xtraTranslate = null;
    gl.bindBuffer(gl.ARRAY_BUFFER, model.coordsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, modelData.vertexPositions, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, modelData.vertexNormals, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, modelData.indices, gl.STATIC_DRAW);
    model.render = function() { 
        gl.bindBuffer(gl.ARRAY_BUFFER, this.coordsBuffer);
        gl.vertexAttribPointer(a_coords_loc, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.vertexAttribPointer(a_normal_loc, 3, gl.FLOAT, false, 0, 0);
        gl.uniform4fv(u_material.diffuseColor, currentColor);
        if (this.xtraTranslate) {
            pushMatrix();
            mat4.translate(modelview,modelview,this.xtraTranslate);
        }
        gl.uniformMatrix4fv(u_modelview, false, modelview );
        mat3.normalFromMat4(normalMatrix, modelview);
        gl.uniformMatrix3fv(u_normalMatrix, false, normalMatrix);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
        if (this.xtraTranslate) {
            popMatrix();
        }
    }
    return model;
}

//--------------------------------- animation framework ------------------------------

    
var animating = false;

/*
This is where you control the animation by changing positions,
and rotations values as needed.
Trial and error works on the numbers. Graph paper design is more efficient. 
*/

function frame() {
    if (animating) {
        //these four variables perform slightly different animations. Gotta love trig!
        frameNumber += 1;
        var myTime = performance.now()* 0.001;
        yval += Math.sin(myTime) / 10;
        zval -= Math.cos(myTime) / 10;
        draw();
        requestAnimationFrame(frame);
    }
}

//called when animate checkbox is selected
function setAnimating(run) {
    if (run != animating) {
        animating = run;
        if (animating)
            requestAnimationFrame(frame);
    }
}

//-------------------------------------------------------------------------


/**
 * initialization
 */
function init() {
    try {
        var canvas = document.getElementById("myCanvas");
        gl = canvas.getContext("webgl") || 
                         canvas.getContext("experimental-webgl");
        if ( ! gl ) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("message").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("message").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context:" + e + "</p>";
        return;
    }
    document.getElementById("animCheck").checked = false;
    document.getElementById("reset").onclick = function() {
       rotator.setView(17,[0,1,2]);
       //reset to default position
        frameNumber = 0;
        zval = 0;
        yval = 0;
       animating = false;
       document.getElementById("animCheck").checked = false;
       draw();
    }
    
    // Create all the basic objects.
    torus = createModel(uvTorus(0.5,1,16,8)); 
    sphere = createModel(uvSphere(1));
    cone = createModel(uvCone(),[0,0,.5]);
    cylinder = createModel(uvCylinder(),[0,0,1.5]);
    disk = createModel(uvCylinder(5.5,0.5,64),[0,0,.25]);
    ring = createModel(ring(3.3,4.8,40));
    cube = createModel(cube());
 
 // This controls the zoom and initial placement
    rotator = new TrackballRotator(canvas,function() {
        if (!animating)
           draw();
    },20,[1,1,2]); 
    draw();
}

/* Initialize the WebGL context.  Called from init() */
function initGL() {
    var prog = createProgram(gl,"vshader-source","fshader-source");
    gl.useProgram(prog);
    gl.enable(gl.DEPTH_TEST);
    
    /* Get attribute and uniform locations */
    
    a_coords_loc =  gl.getAttribLocation(prog, "a_coords");
    a_normal_loc =  gl.getAttribLocation(prog, "a_normal");
    gl.enableVertexAttribArray(a_coords_loc);
    gl.enableVertexAttribArray(a_normal_loc);
    
    u_modelview = gl.getUniformLocation(prog, "modelview");
    u_projection = gl.getUniformLocation(prog, "projection");
    u_normalMatrix =  gl.getUniformLocation(prog, "normalMatrix");
    u_material = {
        diffuseColor: gl.getUniformLocation(prog, "material.diffuseColor"),
        specularColor: gl.getUniformLocation(prog, "material.specularColor"),
        emissiveColor: gl.getUniformLocation(prog, "material.emissiveColor"),
        specularExponent: gl.getUniformLocation(prog, "material.specularExponent")
    };
    u_lights = new Array(4);
    for (var i = 0; i < 4; i++) {
        u_lights[i] = {
            enabled: gl.getUniformLocation(prog, "lights[" + i + "].enabled"),
            position: gl.getUniformLocation(prog, "lights[" + i + "].position"),
            color: gl.getUniformLocation(prog, "lights[" + i + "].color")            
        };
    }
            
    gl.uniform3f( u_material.specularColor, 0.1, 0.1, 0.1 );  // specular properties don't change
    gl.uniform1f( u_material.specularExponent, 16 );
    gl.uniform3f( u_material.emissiveColor, 0, 0, 0);  // default, will be changed temporarily for some objects
    

    for (var i = 1; i < 4; i++) { // set defaults for lights
        gl.uniform1i( u_lights[i].enabled, 0 ); 
        gl.uniform4f( u_lights[i].position, 0, 0, 1, 0 );        
        gl.uniform3f( u_lights[i].color, 1,1,1 ); 
    }
    
  // Lights are set on in the draw() method 
} // end initGL()

/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type String is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 *    The second and third parameters are the id attributes for <script>
 * elementst that contain the source code for the vertex and fragment
 * shaders.
 */
function createProgram(gl, vertexShaderID, fragmentShaderID) {
    function getTextContent( elementID ) {
            // This nested function retrieves the text content of an
            // element on the web page.  It is used here to get the shader
            // source code from the script elements that contain it.
        var element = document.getElementById(elementID);
        var node = element.firstChild;
        var str = "";
        while (node) {
            if (node.nodeType == 3) // this is a text node
                str += node.textContent;
            node = node.nextSibling;
        }
        return str;
    }
    try {
        var vertexShaderSource = getTextContent( vertexShaderID );
        var fragmentShaderSource = getTextContent( fragmentShaderID );
    }
    catch (e) {
        throw "Error: Could not get shader source code from script elements.";
    }
    var vsh = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource(vsh,vertexShaderSource);
    gl.compileShader(vsh);
    if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
        throw "Error in vertex shader:  " + gl.getShaderInfoLog(vsh);
     }
    var fsh = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource(fsh, fragmentShaderSource);
    gl.compileShader(fsh);
    if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
       throw "Error in fragment shader:  " + gl.getShaderInfoLog(fsh);
    }
    var prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
       throw "Link error in program:  " + gl.getProgramInfoLog(prog);
    }
    return prog;
}

/**
 * Draws the image, which consists of either the "world" or a closeup of the "car".
 */
 function draw() {
     //black background
    gl.clearColor(.224,.224,.224,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    
    mat4.perspective(projection, Math.PI/3, 1, 1, 100);
    gl.uniformMatrix4fv(u_projection, false, projection );

    modelview = rotator.getViewMatrix();
    
    lights();
    
    shapes();
}

function lights() {   
     
    // Three of four lights used, all enabled
    // Use lights to enhance models looks
    gl.uniform1i( u_lights[0].enabled, 1 );   
    // Looking down z
    gl.uniform4f( u_lights[0].position, 0,0,1,0 ); 
    gl.uniform3f( u_lights[0].color, 0,0,1 );  //blue front
    
    gl.uniform1i( u_lights[1].enabled, 1 );  
    // Looking down X
    gl.uniform4f( u_lights[1].position, 1,0,0,0 ); 
    gl.uniform3f( u_lights[1].color, 1,1,1 );  //white right
    
     gl.uniform1i( u_lights[2].enabled, 1 );  
    // Looking down Y
    gl.uniform4f( u_lights[2].position, 0,1,0,0 ); 
    gl.uniform3f( u_lights[2].color, 1.0,1.0,0 );  //top red
    
    
    currentColor = [ 0.3, 0.3, 0.3, 1 ];
}

/**
 * Draws and animates each shape. This is my rendition of hierarchical modeling
 */
 function shapes() {

    pushMatrix();//start hierarchy
    //alter view so that camera position is centered in the middle of the ring struct
    mat4.rotate(modelview,modelview, -0.45,[1,0,0]);
    //rotate around the whole model
    mat4.rotate(modelview,modelview, -0.45 * frameNumber / 20,[0,1,0]);

    //sphere
	pushMatrix();
    //scale up and down animation
    mat4.scale(modelview,modelview,[Math.sin(frameNumber / 100),Math.sin(frameNumber / 100),
                                                                Math.sin(frameNumber / 100)]);
    mat4.translate(modelview,modelview,[0, 0, 0]);
	currentColor = [1,0,1,1];
	sphere.render();
	popMatrix();
    
	// outer ring
    pushMatrix();
	mat4.translate(modelview,modelview,[0,0,0]);
    //uses vzal animation variable
	mat4.rotate(modelview,modelview,zval,[1,1,0]);
	mat4.scale(modelview,modelview,[1.3,1.3,1]);
	currentColor = [1,0,0,1];
	ring.render();
	popMatrix();	

    // inner ring
    pushMatrix();
	mat4.translate(modelview,modelview,[0,0,0]);
    //uses a rendition of frameNumber to animate
	mat4.rotate(modelview,modelview,-frameNumber / 5,[1,1,1]);
	mat4.scale(modelview,modelview,[.9,.9,0]);
	currentColor = [1, 1, 0, 1];
	ring.render();
	popMatrix();	
	
    /**
     * four cubes at each corner of the canvas have rotation animations among theier axes
     */
    //top left cube
	pushMatrix();
	mat4.translate(modelview,modelview,[-5,5,0]);
	mat4.rotate(modelview,modelview,frameNumber / 10,[1,1,1]);
	mat4.scale(modelview,modelview,[1.0,.6,1.4]);
	currentColor = [1,1,1,1];
	cube.render();
	popMatrix();	

    // top right cube
	pushMatrix();
	mat4.translate(modelview,modelview,[5,5,0]);
	mat4.rotate(modelview,modelview,frameNumber / 10,[1,1,1]);
	mat4.scale(modelview,modelview,[1.0,.6,1.4]);
	currentColor = [0.17,0,1,1];
	cube.render();
	popMatrix();	

    // bottom left cube
	pushMatrix();
	mat4.translate(modelview,modelview,[-5,-5,0]);
	mat4.rotate(modelview,modelview,frameNumber / 10,[1,1,1]);
	mat4.scale(modelview,modelview,[1.0,.6,1.4]);
	currentColor = [1,0.204,.204,1];
	cube.render();
	popMatrix();

    //bottom right cube
	pushMatrix();
	mat4.translate(modelview,modelview,[5,-5,0]);
	mat4.rotate(modelview,modelview,frameNumber / 10,[1,1,1]);
	mat4.scale(modelview,modelview,[1.0,.6,1.4]);
	currentColor = [1.55,1.53,.29,1];
	cube.render();
	popMatrix();

    /**
     * two white torus at each end of the z-axis and their animations
     */
	// white torus
	pushMatrix();
	mat4.translate(modelview,modelview,[0,0,-7]);
	mat4.rotate(modelview,modelview,3.1416,[1,0,0]);
    mat4.rotate(modelview,modelview,frameNumber / 4,[0,1,0]);
	currentColor = [1, 1, 1,1];
	torus.render();
	popMatrix();	

    // white torus
	pushMatrix();
	mat4.translate(modelview,modelview,[0,0,7]);
	mat4.rotate(modelview,modelview,3.1416,[1,0,0]);
    mat4.rotate(modelview,modelview,frameNumber / 4,[0,1,0]);
	currentColor = [1, 1, 1,1];
	torus.render();
	popMatrix();
	
    /**
     * two pairs of oblong objects that do a slow rotation animation
     */
    //bottom flat shape
    pushMatrix();
	mat4.translate(modelview,modelview,[0,-2,7]);
    mat4.rotate(modelview, modelview, -frameNumber / 90, [1,1,0])
	mat4.scale(modelview,modelview,[2,0.6,1]);
	currentColor = [0.0,1.0,0.1,1];
	cylinder.render();
	popMatrix();	

    //top flat shape
    pushMatrix();
    mat4.translate(modelview,modelview,[0,2,7]);
    mat4.rotate(modelview, modelview, frameNumber / 90, [1,1,0])
	mat4.scale(modelview,modelview,[2,0.6,1]);
	currentColor = [0.0,1.0,0.1,1];
	cylinder.render();
	popMatrix();	


    //bottom flat shape
    pushMatrix();
	mat4.translate(modelview,modelview,[0,-2,-7]);
    mat4.rotate(modelview, modelview, -frameNumber / 90, [1,1,0])
	mat4.scale(modelview,modelview,[2,0.6,1]);
	currentColor = [0.0,1.0,0.1,1];
	cylinder.render();
	popMatrix();	

    //top flat shape
    pushMatrix();
    mat4.translate(modelview,modelview,[0,2,-7]);
    mat4.rotate(modelview, modelview, frameNumber / 90, [1,1,0])
	mat4.scale(modelview,modelview,[2,0.6,1]);
	currentColor = [0.0,1.0,0.1,1];
	cylinder.render();
	popMatrix();	

    popMatrix();//end hierarchy
	  	
}

/**
 *  Push a copy of the current modelview matrix onto the matrix stack.
 */
 function pushMatrix() {
    matrixStack.push( mat4.clone(modelview) );
}


/**
 *  Restore the modelview matrix to a value popped from the matrix stack.
 */
function popMatrix() {
    modelview = matrixStack.pop();
}
