let poses;
const POSITION_INTERVAL = 20;

var ifMax = false;

var videoElement = document.getElementsByClassName("input_video")[0];
// videoElement.play();

document.documentElement.addEventListener('mousedown', () => {
    console.log("viewing video");
    videoElement.play();
});
const selectElement = document.getElementById('cameraSelect');
const selectors = [selectElement];

const canvasElement = document.getElementsByClassName("output_canvas")[0];
const canvasCtx = canvasElement.getContext("2d");
const landmarkContainer = document.getElementsByClassName(
    "landmark-grid-container"
)[0];
// const grid = new LandmarkGrid(landmarkContainer);

let leftWrist, leftIndex, leftPinky, rightPinky, rightWrist, rightIndex, leftThumb, rightThumb, leftThumbX, rightThumbX, leftIndexX, leftPinkyX, leftIndexY, leftWristX, leftWristY, rightIndexX, rightIndexY, rightPinkyX, rightWristX, rightWristY, leftClose, rightClose, distance;


const showTracking = document.getElementById("showTracking");

function detectMax() {
    try {
        /*
          For references to all functions attached to window.max object read the
          "Communicating with Max from within jweb" document from Max documentation.
        */
        window.max.outlet('Running in Max!');
        // Bind a function to an inlet named 'doSomething'
        window.max.bindInlet('hideLive', function (val) {
            videoElement.style.display = val ? 'none' : 'block';
        });
        window.max.bindInlet('hideLandmarks', function (val) {
            window.max.outlet('hideLandmarks', val);
            // canvasElement.style.display = val ? 'none' : 'block';
            landmarkContainer.style.display = val ? 'none' : 'block';
        });
        return true;
    }
    catch (e) {
        console.log('Max no detected. Running in browser.');
    }
    return false;
}

// Detect if running in Max or browser
ifMax = detectMax();

// Get available media devices
navigator.mediaDevices.enumerateDevices()
    .then((devices) => {
        // Filter video devices
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        // selectElement.innerHTML = '';

        selectors.forEach(select => {
            while (select.firstChild) {
                select.removeChild(select.firstChild);
            }
        });

        // Populate the camera select dropdown
        videoDevices.forEach((device, index) => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Camera: ${device.kind} - ${index + 1}`;
            selectElement.appendChild(option);
            if (ifMax) {
                window.max.outlet('adding camera to options: ', device.deviceId, device.label, index);
            }
            if (index == 0) {
                selectElement.value = device.deviceId;
            }
        });
    })
    .catch((error) => {
        console.error('Error accessing media devices:', error);
        if (ifMax) {
            window.max.outlet('Error accessing media devices:', error);
        }
    }).finally(() => {
        // Start video stream with default camera
        startVideoStream(selectElement.value);
    });

// Handle camera selection change
selectElement.addEventListener('change', (event) => {
    const deviceId = event.target.value;
    console.log(`Change camera to: ${deviceId.Camera}`);
    startVideoStream(deviceId);
});

selectElement.addEventListener('click', (event) => {
    videoElement.play();
});

// Start video stream with selected camera
function startVideoStream(deviceId) {

    // Pause existing stream, if any
    videoElement.pause();
    // Close existing stream, if any
    if (videoElement.srcObject) {
        videoElement.srcObject.getTracks().forEach(track => {
            window.max.outlet(`closing existing stream ${track.label}`);
            track.stop();
        });
    }
    videoElement.srcObject = null;

    const videoSource = selectElement.value;
    const constraints = {
        video: { deviceId: videoSource ? { exact: videoSource } : undefined }
    };

    // Request video stream from selected camera
    navigator.mediaDevices.getUserMedia(constraints)
        .then((stream) => {
            window.stream = stream;
            videoElement.srcObject = stream;
            videoElement.play();
            videoElement.onloadedmetadata = () => {
                // once the video stream is loaded, request a callback
                const frameProcessing = (now, metadata) => {
                    processFrame();
                    videoElement.requestVideoFrameCallback(frameProcessing);
                }
                videoElement.requestVideoFrameCallback(frameProcessing);
            };

            const frameProcessing = (now, metadata) => {
                processFrame();
                videoElement.requestVideoFrameCallback(frameProcessing);
            }
            videoElement.requestVideoFrameCallback(frameProcessing);
        })
        .catch((error) => {
            console.error('Error accessing camera:', error);
        });

    if (ifMax) {
        posesToMax();
    }
    // let camera = new Camera(videoElement, {
    //     onFrame: async () => {
    //         await hands.send({ image: videoElement });
    //     },
    //     width: 1280,
    //     height: 720
    // });
    // camera.start();
}

function onResults(results) {
    // if (ifMax) window.max.outlet('onResults');
    // console.log(results);
    if (results.multiHandLandmarks.length > 0) {

        poses = results.multiHandLandmarks;
        // if(poses.length > 0){
        console.dir(poses);
        // }
    }


    //Draw Hand landmarks on screen
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(
        results.image, 0, 0, canvasElement.width, canvasElement.height);
    if (results.multiHandLandmarks && results.multiHandedness) {
        for (let index = 0; index < results.multiHandLandmarks.length; index++) {
            const classification = results.multiHandedness[index];
            const isRightHand = classification.label === 'Right';
            const landmarks = results.multiHandLandmarks[index];

            if (true) {
                drawConnectors(
                    canvasCtx, landmarks, HAND_CONNECTIONS,
                    { color: isRightHand ? '#fff' : '#056df5' }),
                    drawLandmarks(canvasCtx, landmarks, {
                        color: isRightHand ? '#fff' : '#056df5',
                        fillColor: isRightHand ? '#056df5' : '#fff',
                        radius: (x) => {
                            return lerp(x.from.z, -0.15, .1, 10, 1);
                        }
                    })
            };
            if (isRightHand === false) {
                leftIndex = landmarks[8];
                leftWrist = landmarks[0];
                leftThumb = landmarks[4];
                leftPinky = landmarks[20];
            } else {
                rightIndex = landmarks[8];
                rightWrist = landmarks[0];
                rightThumb = landmarks[4];
                rightPinky = landmarks[20];
            }
        }
        canvasCtx.restore();
    }
}

// Start Hands detection
const hands = new Hands({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.3/${file}`;
    }
});

hands.setOptions({
    selfieMode: true,
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

hands.onResults(onResults);

// const camera = new Camera(videoElement, {
//     onFrame: async () => {
//         await hands.send({ image: videoElement });
//     },
//     width: 1280,
//     height: 720
// });
// camera.start();

function processFrame() {
    // Send the videoElement to the MediaPipe
    hands.send({ image: videoElement });
    // window.max.outlet('processFrame');
    console.log('processFrame');
}

///


// max related functions
function posesToMax() {
    // window.max.outlet('posesToMax');
    setInterval(setPoses, POSITION_INTERVAL);
};

function toObject(arr) {
    var rv = {};
    for (var i = 0; i < arr.length; ++i) rv[i] = arr[i];
    return rv;
}

const setPoses = () => {
    if (poses.length > 0) {
        // window.max.outlet('posesToMax: ', toObject(poses)[0]);
        window.max.setDict("poses", toObject(poses));
    }
};

const checkStatus = () => {
    if (ifMax) window.max.outlet('checkStatus');
    if (ifMax) window.max.outlet('hands', hands);
}

window.addEventListener("load", (event) => {
    if (ifMax) window.max.outlet('load');
    checkStatus();
});

