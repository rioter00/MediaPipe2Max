let poses;
const POSITION_INTERVAL = 20;

var ifMax = false;

var videoElement = document.getElementsByClassName("input_video")[0];
// videoElement.play();
const selectElement = document.getElementById("cameraSelect");

const canvasElement = document.getElementsByClassName("output_canvas")[0];
const canvasCtx = canvasElement.getContext("2d");
const landmarkContainer = document.getElementsByClassName(
  "landmark-grid-container"
)[0];
const grid = new LandmarkGrid(landmarkContainer);

function detectMax() {
  try {
    /*
        For references to all functions attached to window.max object read the
        "Communicating with Max from within jweb" document from Max documentation.
      */
    window.max.outlet("Running in Max!");
    // Bind a function to an inlet named 'doSomething'
    window.max.bindInlet("hideLive", function (val) {
      videoElement.style.display = val ? "none" : "block";
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

// Get available media devices
navigator.mediaDevices
  .enumerateDevices()
  .then((devices) => {
    // Filter video devices
    const videoDevices = devices.filter(
      (device) => device.kind === "videoinput"
    );
    selectElement.innerHTML = "";

    console.log("Media Devices? " + videoDevices);
    console.dir(videoDevices);

    // Populate the camera select dropdown
    videoDevices.forEach((device, index) => {
      const option = document.createElement("option");
      console.log("Device?");
      console.dir(device);
      console.log("Creating device Id: " + device.deviceId);
      option.value = device.deviceId;
      option.label = device.label;
      option.text =
        device.label ||
        `Camera: ${device.kind} - ${device.label} - ${index + 1}`;
      selectElement.appendChild(option);
      if (ifMax) {
        window.max.outlet(
          "adding camera to options: ",
          device.deviceId,
          device.label,
          index
        );
      }
      selectElement.value = device.deviceId;
    });
  })
  .catch((error) => {
    console.error("Error accessing media devices:", error);
  })
  .finally(() => {
    // Start video stream with default camera
    console.log("selected element: " + selectElement.value);
    console.dir(selectElement);
    if (selectElement.value != "") {
      startVideoStream(selectElement.value);
    } else {
      console.error("No selected element exists: " + selectElement.value);
    }
  });

// Handle camera selection change
selectElement.addEventListener("change", (event) => {
  const deviceId = event.target.value;
  console.log(`Change camera to: ${deviceId.Camera}`);
  startVideoStream(deviceId);
});

// Start video stream with selected camera
function startVideoStream(deviceId) {
  // Pause existing stream, if any
  console.log("Video Element: " + videoElement);
  console.dir(videoElement);

  videoElement.pause();
  // Close existing stream, if any
  if (videoElement.srcObject) {
    videoElement.srcObject.getTracks().forEach((track) => {
      window.max.outlet(`closing existing stream ${track.label}`);
      track.stop();
    });
  }
  videoElement.srcObject = null;

  const frameProcessing = (now, metadata) => {
    processFrame();
    videoElement.requestVideoFrameCallback(frameProcessing);
  };

  // Request video stream from selected camera
  navigator.mediaDevices
    .getUserMedia({
      video: { deviceId: { exact: deviceId } },
    })
    .then((stream) => {
      videoElement.srcObject = stream;
      videoElement.play();
      videoElement.onloadedmetadata = () => {
        // once the video stream is loaded, request a callback
        // const frameProcessing = (now, metadata) => {
        //   processFrame();
        //   videoElement.requestVideoFrameCallback(frameProcessing);
        // };
        videoElement.requestVideoFrameCallback(frameProcessing);
      };
    })
    .catch((error) => {
      console.error("Error accessing camera:", error);
      console.dir(error);
    });

  // Start pose detection
  const pose = new Pose({
    locateFile: (file) => {
      // return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      return `./pose/${file}`;
    },
  });

  pose.setOptions({
    selfieMode: true,
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: true,
    smoothSegmentation: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
  pose.onResults(onResults);

  async function processFrame() {
    // Send the videoElement to the MediaPipe
    console.log(pose);
    console.dir(pose);
    // await pose.send({ image: videoElement });
  }

  if (ifMax) posesToMax();
}

///
function onResults(results) {
  if (!results.poseLandmarks) {
    grid.updateLandmarks([]);
    return;
  }

  poses = results.poseLandmarks;

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(
    results.segmentationMask,
    0,
    0,
    canvasElement.width,
    canvasElement.height
  );

  // Only overwrite existing pixels.
  canvasCtx.globalCompositeOperation = "source-in";
  canvasCtx.fillStyle = "#00FF00";
  canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

  // Only overwrite missing pixels.
  canvasCtx.globalCompositeOperation = "destination-atop";
  canvasCtx.drawImage(
    results.image,
    0,
    0,
    canvasElement.width,
    canvasElement.height
  );

  canvasCtx.globalCompositeOperation = "source-over";
  drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
    color: "#00FF00",
    lineWidth: 4,
  });
  drawLandmarks(canvasCtx, results.poseLandmarks, {
    color: "#FF0000",
    lineWidth: 2,
  });
  canvasCtx.restore();

  grid.updateLandmarks(results.poseWorldLandmarks);
}

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
