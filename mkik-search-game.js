/*
  
  MKI Search Game
  Copyright (C) 2013  Marcin Kik mki1967@gmail.com


  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.

*/


/*** et-webgl.js -- BEGIN  ***/

/* GLOBAL VARIABLES 1 */

var VERTEX_SHADER_STRING = " \
attribute vec3 aVertexPosition; \
attribute vec4 aVertexColor; \
uniform mat4 uMVMatrix; \
uniform mat4 uPMatrix; \
uniform vec3 mov; \
varying vec4 vColor; \
void main(void) { \
gl_Position = uPMatrix * uMVMatrix * vec4(mov+aVertexPosition, 1.0); \
vColor = aVertexColor; \
} \
";

var FRAGMENT_SHADER_STRING = " \
precision mediump float; \
varying vec4 vColor; \
void main(void) { \
gl_FragColor = vColor; \
} \
";


// var bgColor=[0,0,0]; // defined in test.js

// projection parameters


var projection = new Object();
projection.zNear = 0.25;
projection.zFar  = 300;
projection.zoomY = 3.0;
projection.screenX=500;
projection.screenY=500;

// var traveler= new Object(); // defined in test.js

var vertexPositionSize=3;
var vertexColorSize=3;

var rotXZStep=2.5;
var rotYZStep=2.5;
var maxYZAngle=80; 

var moveStep=0.5;
var XMargin = 30;
var YMargin = 30;
var ZMargin = 30;

var frameBox = new Object(); // framebox for better orientation

function makeFrameBox() {
    var v000= [traveler.vMin[0]-XMargin, traveler.vMin[1]-YMargin,traveler.vMin[2]-ZMargin ];
    var v001= [traveler.vMin[0]-XMargin, traveler.vMin[1]-YMargin,traveler.vMax[2]+ZMargin ];
    var v010= [traveler.vMin[0]-XMargin, traveler.vMax[1]+YMargin,traveler.vMin[2]-ZMargin ];
    var v011= [traveler.vMin[0]-XMargin, traveler.vMax[1]+YMargin,traveler.vMax[2]+ZMargin ];

    var v100= [traveler.vMax[0]+XMargin, traveler.vMin[1]-YMargin,traveler.vMin[2]-ZMargin ];
    var v101= [traveler.vMax[0]+XMargin, traveler.vMin[1]-YMargin,traveler.vMax[2]+ZMargin ];
    var v110= [traveler.vMax[0]+XMargin, traveler.vMax[1]+YMargin,traveler.vMin[2]-ZMargin ];
    var v111= [traveler.vMax[0]+XMargin, traveler.vMax[1]+YMargin,traveler.vMax[2]+ZMargin ];


    frameBox.nrOfLines=  12;
    frameBox.linesVertices = new Float32Array( [
	v000[0],v000[1],v000[2], v001[0],v001[1],v001[2],
	v010[0],v010[1],v000[2], v011[0],v011[1],v011[2],
	v100[0],v100[1],v100[2], v101[0],v101[1],v101[2],
	v110[0],v110[1],v110[2], v111[0],v111[1],v111[2],

	v000[0],v000[1],v000[2], v010[0],v010[1],v010[2],
	v001[0],v001[1],v001[2], v011[0],v011[1],v011[2],
	v100[0],v100[1],v100[2], v110[0],v110[1],v110[2],
	v101[0],v101[1],v101[2], v111[0],v111[1],v111[2],

	v000[0],v000[1],v000[2], v100[0],v100[1],v100[2],
	v001[0],v001[1],v001[2], v101[0],v101[1],v101[2],
	v010[0],v010[1],v010[2], v110[0],v110[1],v110[2],
	v011[0],v011[1],v011[2], v111[0],v111[1],v111[2]
    ] );

    frameBox.linesColors = new Float32Array( [
	1,1,1, 1,1,1,
	1,1,1, 1,1,1,
	1,1,1, 1,1,1,
	1,1,1, 1,1,1,

	1,1,1, 1,1,1,
	1,1,1, 1,1,1,
	1,1,1, 1,1,1,
	1,1,1, 1,1,1,

	1,1,1, 1,1,1,
	1,1,1, 1,1,1,
	1,1,1, 1,1,1,
	1,1,1, 1,1,1
    ] );

    frameBox.nrOfTriangles=0;
    frameBox.trianglesVertices = new Float32Array( [
    ] );

    frameBox.trianglesColors = new Float32Array( [
    ] );
}

/* TOKENS */
var MAX_TOKENS=10;
var tokenPositions=Array();


var startTime;

function rotateXZ(traveler, angle)
{
    traveler.rotXZ=(traveler.rotXZ+angle+360)%360;
}

function rotateYZ(traveler, angle)
{
    if(Math.abs(angle+traveler.rotYZ) <= maxYZAngle)
	traveler.rotYZ += angle;
    else stopIntervalAction();
}

function move(traveler, vector)
{
    var v=worldRotatedVector( traveler, vector );

    v[0]+= traveler.x;
    v[1]+= traveler.y;
    v[2]+= traveler.z;

    if( traveler.vMin[0]-XMargin <= v[0] && v[0] <= traveler.vMax[0]+XMargin &&
	traveler.vMin[1]-YMargin <= v[1] && v[1] <= traveler.vMax[1]+YMargin &&
	traveler.vMin[2]-ZMargin <= v[2] && v[2] <= traveler.vMax[2]+ZMargin )
    {
	traveler.x = v[0];
	traveler.y = v[1];
	traveler.z = v[2];
	checkTokens();
    }
    else stopIntervalAction();

}


function maxDistance(v1,v2)
{
    dx=Math.abs(v1[0]-v2[0]);
    dy=Math.abs(v1[1]-v2[1]);
    dz=Math.abs(v1[2]-v2[2]);

    return Math.max(dx,dy,dz); 
}

var collectedAlert = false;

function checkTokens()
{
    var i;
    var vTraveler=[traveler.x,traveler.y,traveler.z];
    for(i=0; i<tokenPositions.length; i++)
    {
	if(!tokenPositions[i].collected && maxDistance(vTraveler, tokenPositions[i])<1) {
            stopIntervalAction();
            tokenPositions[i].collected= true
            tokenPositions.remaining--;
            collectedAlert= true;
	}
    }
}

function generateTokenPositions(){
    var i;
    for(i=0; i<MAX_TOKENS; i++){
	tokenPositions[i]=[ 
            traveler.vMin[0]+Math.random()*(traveler.vMax[0]-traveler.vMin[0]),
            traveler.vMin[1]+Math.random()*(traveler.vMax[1]-traveler.vMin[1]),
            traveler.vMin[2]+Math.random()*(traveler.vMax[2]-traveler.vMin[2])
        ];
	tokenPositions[i].collected=false;
    }

    tokenPositions.remaining=MAX_TOKENS;
}


/** ACTIONS **/

var ACTION_MOVE=0;
var ACTION_ROTATE=1;
var NR_OF_ACTIONS=2;


var currentAction=ACTION_ROTATE;

function up()
{
    switch(currentAction)
    {
    case ACTION_MOVE:
	move( traveler, [0,moveStep,0] ); 
	break;
    case ACTION_ROTATE:
	rotateYZ(traveler, -rotYZStep );
	break;
    }
    drawScene();  
}

function down()
{
    switch(currentAction)
    {
    case ACTION_MOVE: 
	move( traveler, [0,-moveStep,0] ); 
	break;
    case ACTION_ROTATE:
	rotateYZ(traveler, rotYZStep );
	break;
    }  
    drawScene();  
}

function left()
{
    switch(currentAction)
    {
    case ACTION_MOVE:
	move( traveler, [-moveStep,0,0] ); 
	break;
    case ACTION_ROTATE:
	rotateXZ(traveler, rotXZStep );
	break;
    }  
    drawScene();  
}

function right()
{
    switch(currentAction)
    {
    case ACTION_MOVE: 
	move( traveler, [moveStep,0,0] ); 
	break;
    case ACTION_ROTATE:
	rotateXZ(traveler, -rotXZStep );
	break;
    }  
    drawScene();  
}

function forward()
{
    switch(currentAction)
    {
    case ACTION_MOVE:
    case ACTION_ROTATE:
	move( traveler, [0,0,moveStep] ); 
	break;
    }  
    drawScene();  
}

function back()
{
    switch(currentAction)
    {
    case ACTION_MOVE: 
    case ACTION_ROTATE:
	move( traveler, [0,0,-moveStep] ); 
	break;
    }  
    drawScene();  
}


/*
  </script>

  <!-- input data -->
  <script type="text/javascript" src="./test.js"></script>

  <script>
*/

/*** et-webgl.js -- BEGIN  ***/

/* GLOBAL VARIABLES 2 */


// model-view matrix
var mvMatrix = glMatrix4( 
    1,0,0,0,
    0,1,0,0,
    0,0,1,0,
    0,0,0,1
); 

// projection matrix
var pMatrix = glMatrix4( 
    1,0,0,0,
    0,1,0,0,
    0,0,1,0,
    0,0,0,1
); 

// initial movement
var mov;

var linesBuffer;
var trianglesBuffer;


function glVector3( x,y,z ){
    return new Float32Array(x,y,z)
}

function glMatrix4(  xx, yx, zx, wx,
                     xy, yy, zy, wy,
                     xz, yz, zz, wz,
                     xw, yw, zw, ww )
{
    // sequence of concatenated columns
    return new Float32Array( [ xx, xy, xz, xw,
                               yx, yy, yz, yw,
                               zx, zy, zz, zw,
                               wx, wy, wz, ww ] );
}


function projectionMatrix(projection)
{
    var xx=  projection.zoomY*projection.screenY/projection.screenX;
    var yy=  projection.zoomY;
    var zz=  (projection.zFar+projection.zNear)/(projection.zFar-projection.zNear);
    var zw= 1;
    var wz= -2*projection.zFar*projection.zNear/(projection.zFar-projection.zNear);


    return glMatrix4( xx,  0,  0,  0,
                      0, yy,  0,  0,
                      0,  0, zz, wz,
                      0,  0, zw,  0 );
}



function worldRotatedVector( viewer, vector )
{
    var degToRadians= Math.PI/180;
    var c1= Math.cos(viewer.rotXZ*degToRadians);
    var s1= Math.sin(viewer.rotXZ*degToRadians);
    var c2= Math.cos(viewer.rotYZ*degToRadians);
    var s2= Math.sin(viewer.rotYZ*degToRadians);

    return [    c1*vector[0]-s1*s2*vector[1]-s1*c2*vector[2],
                c2*vector[1]   -s2*vector[2],
		s1*vector[0]+c1*s2*vector[1]+c1*c2*vector[2] 
	   ];
}


function viewerRotatedVector( viewer, vector )
{
    var degToRadians= Math.PI/180;
    var c1= Math.cos(-viewer.rotXZ*degToRadians);
    var s1= Math.sin(-viewer.rotXZ*degToRadians);
    var c2= Math.cos(-viewer.rotYZ*degToRadians);
    var s2= Math.sin(-viewer.rotYZ*degToRadians);

    return [                         c1*vector[0]-s1*vector[2],
				     -s2*s1*vector[0] + c2*vector[1] - s2*c1*vector[2],
				     c2*s1*vector[0] + s2*vector[1] + c2*c1*vector[2] 
	   ];
}


function modelViewMatrix(viewer)
{
    var degToRadians= Math.PI/180;

    var c1= Math.cos(-viewer.rotXZ*degToRadians);
    var s1= Math.sin(-viewer.rotXZ*degToRadians);

    var c2= Math.cos(-viewer.rotYZ*degToRadians);
    var s2= Math.sin(-viewer.rotYZ*degToRadians);

    var v=viewerRotatedVector(viewer, [-viewer.x, -viewer.y, -viewer.z]);

    return glMatrix4 (   c1,   0,    -s1,  v[0],
			 -s2*s1,  c2, -s2*c1,  v[1],
			 c2*s1,  s2,  c2*c1,  v[2],
			 0,   0,      0,    1  );
}

/// CALLBACKS
var intervalAction=null;

function stopIntervalAction(){
    if(intervalAction != null) {
	window.clearInterval(intervalAction);
	intervalAction=null
    }
}

function onWindowResize() {

    /*
      if(intervalAction != null) {
      window.clearInterval(intervalAction);
      intervalAction=null
      }
    */

    stopIntervalAction()

    var wth = parseInt(window.innerWidth);
    var hth = parseInt(window.innerHeight);
    var canvas = document.getElementById("canvasId");

    canvas.setAttribute("width", ''+wth);
    canvas.setAttribute("height", ''+hth -5);
    gl.viewportWidth = wth;
    gl.viewportHeight = hth;
    projection.screenX=wth;
    projection.screenY=hth;

    pMatrix= projectionMatrix(projection);

    gl.viewport(0,0,wth,hth);
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    drawScene();

}



function onMouseDown(evt){
    var wth = parseInt(window.innerWidth);
    var hth = parseInt(window.innerHeight);
    var xSector= Math.floor(3*evt.clientX/wth);
    var ySector= Math.floor(3*evt.clientY/hth);

    sectorString = ""+xSector+","+ySector

    if(intervalAction != null) {
	// window.clearInterval(intervalAction);
	// intervalAction=null
	stopIntervalAction();
	return
    }

    switch(sectorString)
    {
    case "0,1":
	intervalAction=window.setInterval(left,100);
	break;
    case "2,1":
	intervalAction=window.setInterval(right,100);
	break;
    case "1,0":
	intervalAction=window.setInterval(up,100);
	break;
    case "1,2":
	intervalAction=window.setInterval(down,100);
	break;
    case "2,0":
	intervalAction=window.setInterval(forward,100);
	break;
    case "2,2":
	intervalAction=window.setInterval(back,100);
	break;
    case "1,1":
	traveler.rotYZ=0; drawScene();
	break;
    case "0,0":
	currentAction = ACTION_MOVE;
	break
    case "0,2":
	currentAction = ACTION_ROTATE;
	break;

    }
    // drawScene(); // included in actions
    // alert("mouse down: "+evt.clientX+","+ evt.clientY+":"+sectorString);
}

function onKeyDown(e){
    /*
      if(intervalAction != null) {
      window.clearInterval(intervalAction);
      intervalAction=null
      }
    */

    stopIntervalAction();

    code=e.keyCode? e.keyCode : e.charCode;
    switch(code)
    {
    case 38: // up
	up();
	break;
    case 40:
	down();
	break;
    case 37:
	left();
	break;
    case 39:
	right();
	break;
    case 70: // F
	forward();
	break;
    case 66: // B
	back();
	break;
    case 32: // space
    case 76: // L
	traveler.rotYZ=0; drawScene();
	// rotationReset();
	break;
    case 69: // E
	// toggleMonoStereo();break;
    case 77: // M
	currentAction = ACTION_MOVE;
	break;
    case 191: // ?
	// help(); break;
    case 68: // D
	// dump(); break;
    case 13: // enter
    case 187: // +
	// linkingPlus();
	break;
    case 27: // escape
    case 189: // -
	// linkingMinus();
	break;
    case 86: // V
	break;
    case 46: // Delete
    case 51: // #
	// deleteSelected();
	// unlink();
	break;
    case 81: // Q
	alert("remaining tokens: "+tokenPositions.remaining);
	break;

    case 82: // R
	currentAction = ACTION_ROTATE;
	break;
    case 83: // S
	// linkSelect();
	break;
    case 65: // A
	// selectAll();
	break;
    case 56: // *
	// starSelect();
	break;
    case 88: // X
	// toggleSelections();
	break;
    case 74: // J
	// jumpToNearestEndtpoint();
	break;

    };
    // editor.redraw();
    // alert(code); // for tests
    // drawScene(); // included in actions
    // alert("drawn");
}




/*** et-webgl.js -- END  ***/

var gl;
function initGL(canvas) {
    try {
        gl = canvas.getContext("experimental-webgl");
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    } catch (e) {
    }
    if (!gl) {
        alert("Could not initialise WebGL, sorry :-(");
    }
}



var shaderProgram;

function tryToCompileShader(shader)
{
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
    }
}

function initShaders() {
    var fragmentShader =gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, FRAGMENT_SHADER_STRING);
    tryToCompileShader(fragmentShader);

    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, VERTEX_SHADER_STRING);
    tryToCompileShader(vertexShader);

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }

    gl.useProgram(shaderProgram);

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
    gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);


    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    shaderProgram.vMov = gl.getUniformLocation(shaderProgram, "mov");
}




function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

var triangleVertexPositionBuffer;
var squareVertexPositionBuffer;

function initBuffers(graph) {


    graph.linesVerticesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, graph.linesVerticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, graph.linesVertices, gl.STATIC_DRAW);

    graph.linesColorsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, graph.linesColorsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, graph.linesColors, gl.STATIC_DRAW);

    graph.trianglesVerticesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, graph.trianglesVerticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, graph.trianglesVertices, gl.STATIC_DRAW);

    graph.trianglesColorsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, graph.trianglesColorsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, graph.trianglesColors, gl.STATIC_DRAW);

}



function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.depthFunc(gl.LEQUAL);
    if(collectedAlert) {
	gl.clearColor(1.0, 0.0, 0.0, 1.0); // RED
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        collectedAlert=false;
	return;
    }
    gl.clearColor(bgColor[0], bgColor[1], bgColor[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    mvMatrix= modelViewMatrix(traveler);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);


    // setMatrixUniforms();
    // gl.uniform3fv(shaderProgram.vMov, glVector3( 0,0,0 ) );
    gl.uniform3f(shaderProgram.vMov,  0,0,0  );
    drawGraph(scene);
    drawGraph(frameBox);

    drawTokens()

    if(tokenPositions.remaining==0) {
	alert("CONGRATULATIONS !!!\n YOU HAVE COLLECTED ALL TOKENS.\n"+
              "Time: "+((new Date).getTime()-startTime)+" milliseconds" );
	startGame();
    }
}


function drawTokens()
{
    var i;
    for(i=0; i<tokenPositions.length; i++) {
	if( ! tokenPositions[i].collected ) {
            gl.uniform3f(shaderProgram.vMov, tokenPositions[i][0],  tokenPositions[i][1],tokenPositions[i][2] );
            drawGraph(token); // test
	} 
    }

    gl.uniform3f(shaderProgram.vMov,  0,0,0  ); // reset mov uniform

}


function drawGraph(graph) {

    /* draw lines */
    gl.bindBuffer(gl.ARRAY_BUFFER, graph.linesVerticesBuffer );
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, vertexPositionSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, graph.linesColorsBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, vertexColorSize, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINES, 0, 2*graph.nrOfLines);
    /* draw triangles */
    gl.bindBuffer(gl.ARRAY_BUFFER, graph.trianglesVerticesBuffer );
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, vertexPositionSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, graph.trianglesColorsBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, vertexColorSize, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3*graph.nrOfTriangles);

}




function startGame()
{
    generateTokenPositions();
    alert("MKI SEARCHING GAME:\n\n"+
	  "FIND AND COLLECT "+tokenPositions.remaining+" TOKENS!\n\n"+
	  "Use the keys:\n"+
	  "     'B','F', Arrow Keys - move/rotate\n"+
	  "     'M','R' - moving/rotating mode\n"+
	  "      Space - set observer upright\n"+
	  "     'Q' - report number of remaing tokens\n"+
	  "or touch one of the 3x3 sectors of the window to activate action:\n"+
	  "      up-left - switch to moving mode\n"+
	  "      down-left - switch to rotating mode\n"+
	  "      up-right  - forward\n"+
	  "      down-right - backward\n"+
	  "      center -  set observer upright\n"+
	  "      left/up/right/down-middle - like Arrow Keys\n" 
	 );
    drawScene();
    startTime = (new Date()).getTime();
}

function webGLStart() {
    var canvas = document.getElementById("canvasId");
    // ctx = canvas.getContext("2d");
    initGL(canvas);
    initShaders();

    initBuffers(scene);
    initBuffers(token);
    makeFrameBox();
    initBuffers(frameBox);

    //        gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearColor(bgColor[0], bgColor[1], bgColor[2], 1.0);
    gl.enable(gl.DEPTH_TEST);

    onWindowResize(); // sets projection an model view matrices and redraws


    // alert(HELP_STRING);

    /* set callbacks */



    window.onresize=onWindowResize;
    window.onkeydown=onKeyDown;
    window.onmousedown=onMouseDown;


    //tests
    // alert(VERTEX_SHADER_STRING);
    // alert(FRAGMENT_SHADER_STRING);
    // window.onkeyup= function(evt) { alert("keyup"+evt.toString()); }
    // window.onmousedown= function(evt){ alert("mouse down "+evt.clientX+" "+evt.clientY); }
    // window.onmouseup= function(evt){ alert("mouse up "+evt.toString()); }

    startGame();

}



