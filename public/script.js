// Start pose detection
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "https://cdn.skypack.dev/@mediapipe/tasks-vision@0.10.0";

let poses;
const POSITION_INTERVAL = 20;
var runningMode = "IMAGE";
let webcamRunning = false;
const videoHeight = "360px";
const videoWidth = "480px";
let poseLandmarker = undefined;
let enableWebcamButton;

var ifMax = false;

var video = document.getElementsByClassName("input_video")[0];
const selectElement = document.getElementById("cameraSelect");

const canvasElement = document.getElementsByClassName("output_canvas")[0];
const canvasCtx = canvasElement.getContext("2d");
const drawingUtils = new DrawingUtils(canvasCtx);

const landmarkContainer = document.getElementsByClassName(
  "landmark-grid-container"
)[0];
// const grid = new LandmarkGrid(landmarkContainer);

const createPoseLandmarker = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );
  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
      delegate: "GPU",
    },
    runningMode: runningMode,
    numPoses: 2,
  });
  // demosSection.classList.remove("invisible");
};
createPoseLandmarker();

const hasGetUserMedia = () => {
  var _a;
  return !!((_a = navigator.mediaDevices) === null || _a === void 0
    ? void 0
    : _a.getUserMedia);
};

if (hasGetUserMedia()) {
  enableWebcamButton = document.getElementById("webcamButton");
  enableWebcamButton.addEventListener("click", enableCam);
} else {
  console.warn("getUserMedia() is not supported by your browser");
}

// Enable the live webcam view and start detection.
function enableCam(event) {
  console.log("enableCam");
  if (!poseLandmarker) {
    console.log("Wait! poseLandmaker not loaded yet.");
    return;
  }
  if (webcamRunning === true) {
    webcamRunning = false;
    enableWebcamButton.innerText = "ENABLE PREDICTIONS";
  } else {
    webcamRunning = true;
    enableWebcamButton.innerText = "DISABLE PREDICTIONS";
  }
  // getUsermedia parameters.
  const constraints = {
    video: true,
  };
  // Activate the webcam stream.
  navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    video.srcObject = stream;
    video.addEventListener("loadeddata", predictWebcam);
  });
}
let lastVideoTime = -1;

async function predictWebcam() {
  canvasElement.style.height = videoHeight;
  video.style.height = videoHeight;
  canvasElement.style.width = videoWidth;
  video.style.width = videoWidth;
  // Now let's start detecting the stream.
  if (runningMode === "IMAGE") {
    runningMode = "VIDEO";
    await poseLandmarker.setOptions({ runningMode: "VIDEO", selfieMode: true });
  }
  // await poseLandmarker.setOptions({ runningMode: "VIDEO" });
  let startTimeMs = performance.now();
  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    poseLandmarker.detectForVideo(video, startTimeMs, (result) => {
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      if (ifMax) {
        poses = result.landmarks[0];
      }
      for (const landmark of result.landmarks) {
        drawingUtils.drawLandmarks(landmark, {
          radius: (data) => DrawingUtils.lerp(data.from.z, -0.15, 0.1, 5, 1),
        });
        drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS);
      }
      canvasCtx.restore();
    });
  }
  // Call this function again to keep predicting when the browser is ready.
  if (webcamRunning === true) {
    window.requestAnimationFrame(predictWebcam);
  }
}

///
function detectMax() {
  try {
    /*
        For references to all functions attached to window.max object read the
        "Communicating with Max from within jweb" document from Max documentation.
      */
    window.max.outlet("Running in Max!");
    // Bind a function to an inlet named 'doSomething'
    window.max.bindInlet("hideLive", function (val) {
      video.style.display = val ? "none" : "block";
    });
    window.max.bindInlet("hideLandmarks", function (val) {
      window.max.outlet("hideLandmarks", val);
      canvasElement.style.display = val ? "none" : "block";
      landmarkContainer.style.display = val ? "none" : "block";
    });
    return true;
  } catch (e) {
    console.log("Max no detected. Running in browser.");
  }
  return false;
}

// Detect if running in Max or browser
ifMax = detectMax();

//-----------------

//-----------------
// // Get available media devices
// navigator.mediaDevices
//   .enumerateDevices()
//   .then((devices) => {
//     // Filter video devices
//     const videoDevices = devices.filter(
//       (device) => device.kind === "videoinput"
//     );
//     selectElement.innerHTML = "";

//     console.log("Media Devices? " + videoDevices);
//     console.dir(videoDevices);

//     // Populate the camera select dropdown
//     videoDevices.forEach((device, index) => {
//       const option = document.createElement("option");
//       console.log("Device?");
//       console.dir(device);
//       console.log("Creating device Id: " + device.deviceId);
//       option.value = device.deviceId;
//       option.label = device.label;
//       option.text =
//         device.label ||
//         `Camera: ${device.kind} - ${device.label} - ${index + 1}`;
//       selectElement.appendChild(option);
//       if (ifMax) {
//         window.max.outlet(
//           "adding camera to options: ",
//           device.deviceId,
//           device.label,
//           index
//         );
//       }
//       selectElement.value = device.deviceId;
//     });
//   })
//   .catch((error) => {
//     console.error("Error accessing media devices:", error);
//   })
//   .finally(() => {
//     // Start video stream with default camera
//     console.log("selected element: " + selectElement.value);
//     console.dir(selectElement);
//     if (selectElement.value != "") {
//       startVideoStream(selectElement.value);
//     } else {
//       console.error("No selected element exists: " + selectElement.value);
//     }
//   });

// // Handle camera selection change
// selectElement.addEventListener("change", (event) => {
//   const deviceId = event.target.value;
//   console.log(`Change camera to: ${deviceId.Camera}`);
//   startVideoStream(deviceId);
// });

// // Start video stream with selected camera
// function startVideoStream(deviceId) {
//   // Pause existing stream, if any
//   console.log("Video Element: " + video);
//   console.dir(video);

//   video.pause();
//   // Close existing stream, if any
//   if (video.srcObject) {
//     video.srcObject.getTracks().forEach((track) => {
//       window.max.outlet(`closing existing stream ${track.label}`);
//       track.stop();
//     });
//   }
//   video.srcObject = null;

//   const frameProcessing = (now, metadata) => {
//     processFrame();
//     video.requestVideoFrameCallback(frameProcessing);
//   };

//   // Request video stream from selected camera
//   navigator.mediaDevices
//     .getUserMedia({
//       video: { deviceId: { exact: deviceId } },
//     })
//     .then((stream) => {
//       video.srcObject = stream;
//       video.play();
//       video.onloadedmetadata = () => {
//         // once the video stream is loaded, request a callback
//         // const frameProcessing = (now, metadata) => {
//         //   processFrame();
//         //   video.requestVideoFrameCallback(frameProcessing);
//         // };
//         video.requestVideoFrameCallback(frameProcessing);
//       };
//     })
//     .catch((error) => {
//       console.error("Error accessing camera:", error);
//       console.dir(error);
//     });

//   // Start pose detection
//   const pose = new Pose({
//     locateFile: (file) => {
//       // return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
//       return `./pose/${file}`;
//     },
//   });

//   pose.setOptions({
//     selfieMode: true,
//     modelComplexity: 1,
//     smoothLandmarks: true,
//     enableSegmentation: true,
//     smoothSegmentation: true,
//     minDetectionConfidence: 0.5,
//     minTrackingConfidence: 0.5,
//   });
//   pose.onResults(onResults);

//   async function processFrame() {
//     // Send the video to the MediaPipe
//     // console.log(pose);
//     // console.dir(pose);
//     // await pose.send({ image: video });
//   }

//   if (ifMax) posesToMax();
// }

// ///
// function onResults(results) {
//   if (!results.poseLandmarks) {
//     grid.updateLandmarks([]);
//     return;
//   }

//   poses = results.poseLandmarks;

//   canvasCtx.save();
//   canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
//   canvasCtx.drawImage(
//     results.segmentationMask,
//     0,
//     0,
//     canvasElement.width,
//     canvasElement.height
//   );

//   // Only overwrite existing pixels.
//   canvasCtx.globalCompositeOperation = "source-in";
//   canvasCtx.fillStyle = "#00FF00";
//   canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

//   // Only overwrite missing pixels.
//   canvasCtx.globalCompositeOperation = "destination-atop";
//   canvasCtx.drawImage(
//     results.image,
//     0,
//     0,
//     canvasElement.width,
//     canvasElement.height
//   );

//   canvasCtx.globalCompositeOperation = "source-over";
//   drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
//     color: "#00FF00",
//     lineWidth: 4,
//   });
//   drawLandmarks(canvasCtx, results.poseLandmarks, {
//     color: "#FF0000",
//     lineWidth: 2,
//   });
//   canvasCtx.restore();

//   grid.updateLandmarks(results.poseWorldLandmarks);
// }

// max related functions
function posesToMax() {
  window.max.outlet("posesToMax");
  setInterval(setPoses, POSITION_INTERVAL);
}

function toObject(arr) {
  var rv = {};
  for (var i = 0; i < arr.length; ++i) rv[i] = arr[i];
  return rv;
}

const setPoses = () => {
  window.max.setDict("poses", toObject(poses));
};

if (ifMax) {
  posesToMax();
}
